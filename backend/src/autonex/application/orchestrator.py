"""Bounded master workflow with specialist routing and observable tool calls."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from time import perf_counter
from typing import Literal, TypedDict, cast
from uuid import uuid4

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from opentelemetry import trace

from autonex.application.ports import LanguageModel, RunRepository
from autonex.application.telemetry import current_execution
from autonex.application.tools import AgentTools
from autonex.domain.models import (
    AgentRun,
    Configuration,
    Explanation,
    Intent,
    Quote,
    RunRequest,
    Source,
    TraceStep,
    Vehicle,
)
from autonex.domain.services import InvalidConfigurationError, ProviderError

logger = logging.getLogger("autonex.workflow")


async def bounded_call[T](call: Callable[[], Awaitable[T]]) -> tuple[T, int]:
    for attempt in range(2):
        try:
            return await call(), attempt
        except ProviderError:
            if attempt:
                raise
            current_execution().retries += 1
            await asyncio.sleep(0.1)
    raise ProviderError("Retry budget exhausted.")


class RunState(TypedDict, total=False):
    request: RunRequest
    intent: Intent
    vehicles: list[Vehicle]
    sources: list[Source]
    configuration: Configuration
    quote: Quote
    explanation: Explanation
    trace: list[TraceStep]


def step(node: str, label: str, detail: str, started: float, retries: int = 0) -> TraceStep:
    return TraceStep(
        node=node,
        label=label,
        detail=detail,
        duration_ms=round((perf_counter() - started) * 1000),
        retries=retries,
    )


class MasterOrchestrator:
    def __init__(
        self,
        model: LanguageModel,
        tools: AgentTools,
        runs: RunRepository,
        mode: Literal["demo", "live"],
    ) -> None:
        self.model, self.tools, self.runs, self.mode = model, tools, runs, mode
        graph = StateGraph(RunState)
        graph.add_node("master", self._master)
        graph.add_node("understanding", self._plan)
        graph.add_node("research", self._research)
        for priority in ("performance", "comfort", "value"):
            graph.add_node(f"{priority}_specialist", self._configure)
            graph.add_edge(f"{priority}_specialist", "tools")
        graph.add_node("tools", self._price)
        graph.add_node("validation", self._validate)
        graph.add_node("synthesis", self._synthesize)
        graph.add_edge(START, "master")
        graph.add_edge("master", "understanding")
        graph.add_edge("understanding", "research")
        graph.add_conditional_edges(
            "research",
            lambda state: f"{state['intent'].priority}_specialist",
            {
                f"{priority}_specialist": f"{priority}_specialist"
                for priority in ("performance", "comfort", "value")
            },
        )
        graph.add_edge("tools", "validation")
        graph.add_edge("validation", "synthesis")
        graph.add_edge("synthesis", END)
        self.checkpointer = InMemorySaver()
        self.graph = graph.compile(checkpointer=self.checkpointer)

    async def _master(self, state: RunState) -> RunState:
        started = perf_counter()
        return {
            "trace": [
                step(
                    "master",
                    "Master orchestrator",
                    "Initialized typed workflow state and bounded execution policy.",
                    started,
                )
            ]
        }

    async def _plan(self, state: RunState) -> RunState:
        started = perf_counter()
        intent, retries = await bounded_call(lambda: self.model.plan(state["request"]))
        vehicles = await self.tools.catalog()
        requested = state["request"].vehicle_id or intent.vehicle_entity
        if requested:
            vehicles = [vehicle for vehicle in vehicles if vehicle.id == requested]
        elif intent.body != "any":
            vehicles = [vehicle for vehicle in vehicles if vehicle.body_type == intent.body]
        if not vehicles:
            raise InvalidConfigurationError(
                "No catalog vehicle matches the requested body or model."
            )
        return {
            "intent": intent,
            "vehicles": vehicles,
            "trace": [
                *state["trace"],
                step(
                    "understanding",
                    "Question understanding agent",
                    f"Routed to the {intent.priority} specialist; catalog loaded through MCP.",
                    started,
                    retries,
                ),
            ],
        }

    async def _research(self, state: RunState) -> RunState:
        started = perf_counter()
        vehicles = state["vehicles"]
        sources = await self.tools.search(
            state["intent"].retrieval_query, vehicles[0].id if len(vehicles) == 1 else None
        )
        return {
            "sources": sources,
            "trace": [
                *state["trace"],
                step(
                    "research",
                    "Knowledge retrieval",
                    f"Retrieved {len(sources)} document chunks through MCP.",
                    started,
                ),
            ],
        }

    async def _configure(self, state: RunState) -> RunState:
        started = perf_counter()
        config, retries = await bounded_call(
            lambda: self.model.configure(
                state["request"], state["intent"], state["vehicles"], state["sources"]
            )
        )
        if config.vehicle_id not in {vehicle.id for vehicle in state["vehicles"]}:
            raise ProviderError("The agent selected a vehicle outside the permitted catalog.")
        return {
            "configuration": config,
            "trace": [
                *state["trace"],
                step(
                    "specialist",
                    "Vehicle intelligence agent",
                    f"Selected {config.vehicle_id} options; priority: {state['intent'].priority}.",
                    started,
                    retries,
                ),
            ],
        }

    async def _price(self, state: RunState) -> RunState:
        started = perf_counter()
        quote = await self.tools.quote(state["configuration"])
        return {
            "quote": quote,
            "trace": [
                *state["trace"],
                step(
                    "tools",
                    "MCP tool agent",
                    "Validated every option and calculated the catalog estimate through MCP.",
                    started,
                ),
            ],
        }

    async def _validate(self, state: RunState) -> RunState:
        started = perf_counter()
        quote = state["quote"]
        if (
            quote.configuration != state["configuration"]
            or sum(line.amount for line in quote.lines) != quote.total
        ):
            raise ProviderError("Quote validation failed.")
        return {
            "trace": [
                *state["trace"],
                step(
                    "validation",
                    "Validation agent",
                    "Validated configuration identity, option schemas and price arithmetic. "
                    "Citation IDs are checked before response completion.",
                    started,
                ),
            ]
        }

    async def _synthesize(self, state: RunState) -> RunState:
        started = perf_counter()
        vehicle = next(
            item for item in state["vehicles"] if item.id == state["configuration"].vehicle_id
        )
        explanation, retries = await bounded_call(
            lambda: self.model.explain(state["request"], vehicle, state["quote"], state["sources"])
        )
        if not set(explanation.source_ids).issubset({source.id for source in state["sources"]}):
            raise ProviderError("The agent cited evidence that was not retrieved.")
        return {
            "explanation": explanation,
            "trace": [
                *state["trace"],
                step(
                    "synthesis",
                    "Response synthesis",
                    "Assembled the recommendation and checked evidence references.",
                    started,
                    retries,
                ),
            ],
        }

    async def run(
        self, request: RunRequest, on_step: Callable[[TraceStep], Awaitable[None]] | None = None
    ) -> AgentRun:
        thread_id = str(uuid4())
        state: RunState = {"request": request}
        try:
            with trace.get_tracer("autonex").start_as_current_span("agent.workflow") as span:
                span.set_attribute("autonex.mode", self.mode)
                span.set_attribute("autonex.run_id", thread_id)
                async for update in self.graph.astream(
                    state,
                    {"recursion_limit": 16, "configurable": {"thread_id": thread_id}},
                    stream_mode="updates",
                ):
                    for value in update.values():
                        state.update(cast(RunState, value))
                        current = state["trace"][-1]
                        logger.info(
                            "run=%s node=%s duration_ms=%s retries=%s",
                            thread_id,
                            current.node,
                            current.duration_ms,
                            current.retries,
                        )
                        if on_step:
                            await on_step(current)
        finally:
            await self.checkpointer.adelete_thread(thread_id)
        warnings = [
            "AUTONEX demonstration configuration and USD estimate. "
            "Not manufacturer inventory, MSRP or a factory build. "
            "No official manufacturer affiliation. "
            "Taxes, registration and delivery are excluded."
        ]
        if self.mode == "demo":
            warnings.append(
                "Demo mode: deterministic planning and lexical retrieval; no LLM is called."
            )
        if not state["sources"]:
            warnings.append("No matching knowledge was retrieved; verify details in the catalog.")
        budget = state["intent"].budget
        if budget and state["quote"].total > budget:
            warnings.append(
                "This configuration exceeds your stated budget. "
                "No within-budget configuration was selected."
            )
        explanation = state["explanation"]
        run = AgentRun(
            id=str(uuid4()),
            created_at=datetime.now(UTC),
            mode=self.mode,
            prompt=request.prompt,
            summary=explanation.summary,
            rationale=explanation.rationale,
            quote=state["quote"],
            sources=[source for source in state["sources"] if source.id in explanation.source_ids],
            trace=state["trace"],
            warnings=warnings,
            needs_clarification=state["intent"].task == "clarification",
        )
        self.runs.save_run(run)
        return run
