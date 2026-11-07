"""HTTP composition root. Domain workflows remain independent of transport."""

import asyncio
import contextlib
import json
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from time import perf_counter
from typing import Annotated, Any, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from langchain_core.callbacks import get_usage_metadata_callback
from mcp import Client
from mcp.server import MCPServer
from pydantic import BaseModel, Field

from autonex.application.orchestrator import MasterOrchestrator
from autonex.application.ports import LanguageModel
from autonex.application.reports import ReportAgent
from autonex.application.telemetry import ExecutionFacts, execution
from autonex.application.tools import CatalogTools
from autonex.domain.models import (
    AgentRun,
    Configuration,
    KnowledgeDocument,
    Quote,
    RunRequest,
    TestDriveReceipt,
    TestDriveRequest,
    TraceStep,
    Vehicle,
)
from autonex.domain.services import InvalidConfigurationError, NotFoundError, ProviderError
from autonex.infrastructure.database import SQLAlchemyRepository
from autonex.infrastructure.knowledge import DocumentKnowledgeRepository
from autonex.infrastructure.llm import DemoLanguageModel, LangChainLanguageModel
from autonex.infrastructure.mcp import MCPAgentTools, create_mcp_server
from autonex.infrastructure.reports import build_report
from autonex.infrastructure.settings import Settings
from autonex.infrastructure.sqlite import SQLiteRepository

logger = logging.getLogger("autonex.api")


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    mode: Literal["demo", "live"]
    model: str
    retrieval: Literal["lexical", "hybrid"]
    mcp: Literal["available"] = "available"


class ServiceSearch(BaseModel):
    query: str = Field(min_length=1, max_length=200)


class ServiceDemo(BaseModel):
    vehicle_id: str = Field(min_length=1, max_length=100)
    service: str = Field(min_length=1, max_length=200)


@dataclass
class Container:
    settings: Settings
    repository: SQLiteRepository | SQLAlchemyRepository
    knowledge: DocumentKnowledgeRepository
    tools: CatalogTools
    master: MasterOrchestrator
    mcp: MCPServer
    capacity: asyncio.Semaphore
    reports: ReportAgent


def container(request: Request) -> Container:
    value: Container = request.app.state.container
    return value


Services = Annotated[Container, Depends(container)]


def create_app(settings: Settings | None = None, model: LanguageModel | None = None) -> FastAPI:
    config = settings or Settings()
    repository = (
        SQLAlchemyRepository(config.database_url, config.catalog_path)
        if config.database_url
        else SQLiteRepository(config.database_path, config.catalog_path)
    )
    knowledge = DocumentKnowledgeRepository(config)
    tools = CatalogTools(repository, knowledge)
    mcp = create_mcp_server(tools)
    mcp_app = mcp.streamable_http_app(
        streamable_http_path="/", stateless_http=True, json_response=True
    )
    language_model = model or (
        LangChainLanguageModel(config) if config.agent_mode == "live" else DemoLanguageModel()
    )
    services = Container(
        config,
        repository,
        knowledge,
        tools,
        MasterOrchestrator(language_model, MCPAgentTools(mcp), repository, config.agent_mode),
        mcp,
        asyncio.Semaphore(config.max_concurrent_runs),
        ReportAgent(repository, build_report),
    )

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if config.tracing_enabled:
            from opentelemetry import trace
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

            provider = TracerProvider()
            provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
            trace.set_tracer_provider(provider)
        async with mcp.session_manager.run():
            yield
        if isinstance(repository, SQLAlchemyRepository):
            repository.engine.dispose()

    app = FastAPI(
        title="AUTONEX AI API",
        version="1.0.0",
        lifespan=lifespan,
        description=(
            "Independent automotive AI demonstration. "
            "No official manufacturer affiliation or live partner access."
        ),
    )
    app.state.container = services
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Request-ID"],
    )

    @app.exception_handler(NotFoundError)
    async def not_found(_request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(InvalidConfigurationError)
    async def invalid(_request: Request, exc: InvalidConfigurationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.get("/api/v1/health", response_model=Health)
    def health(services: Services) -> Health:
        return Health(
            mode=services.settings.agent_mode,
            model=services.settings.llm_model
            if services.settings.agent_mode == "live"
            else "Deterministic demo",
            retrieval="hybrid" if services.settings.agent_mode == "live" else "lexical",
        )

    @app.get("/api/v1/vehicles", response_model=list[Vehicle])
    def vehicles(services: Services) -> list[Vehicle]:
        return services.repository.list_vehicles()

    @app.get("/api/v1/vehicles/{vehicle_id}", response_model=Vehicle)
    def vehicle(vehicle_id: str, services: Services) -> Vehicle:
        return services.repository.get_vehicle(vehicle_id)

    @app.post("/api/v1/quotes", response_model=Quote)
    def quote(configuration: Configuration, services: Services) -> Quote:
        return services.tools.quote(configuration)

    @app.get("/api/v1/knowledge", response_model=list[KnowledgeDocument])
    def documents(services: Services) -> list[KnowledgeDocument]:
        return services.knowledge.documents()

    @app.get("/api/v1/operations")
    def operations(services: Services) -> dict[str, Any]:
        return services.repository.operations()

    async def execute(
        body: RunRequest, on_step: Callable[[TraceStep], Awaitable[None]] | None = None
    ) -> AgentRun:
        if body.vehicle_id:
            services.repository.get_vehicle(body.vehicle_id)
        try:
            await asyncio.wait_for(services.capacity.acquire(), timeout=0.1)
        except TimeoutError as exc:
            raise HTTPException(429, "All workflow slots are busy. Please retry shortly.") from exc
        request_id = str(uuid4())
        started = perf_counter()
        facts = ExecutionFacts()
        context = execution.set(facts)
        status = "failed"
        tokens = 0
        try:
            with get_usage_metadata_callback() as usage:
                try:
                    async with asyncio.timeout(config.agent_timeout_seconds):
                        result = await services.master.run(body, on_step)
                    status = "successful"
                    return result
                finally:
                    tokens = sum(
                        value.get("total_tokens", 0) for value in usage.usage_metadata.values()
                    )
        except TimeoutError as exc:
            raise HTTPException(504, "The workflow timed out. Please try again.") from exc
        except (ProviderError, InvalidConfigurationError) as exc:
            raise HTTPException(
                502,
                "The AI provider or a tool could not produce a valid recommendation. Please retry.",
            ) from exc
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Agent run %s failed (%s)", request_id, type(exc).__name__)
            raise HTTPException(502, "The workflow could not complete. Please retry.") from exc
        finally:
            try:
                services.repository.record_operation(
                    {
                        "id": request_id,
                        "created_at": datetime.now(UTC).isoformat(),
                        "status": status,
                        "prompt": body.prompt,
                        "duration_ms": round((perf_counter() - started) * 1000),
                        "retries": facts.retries,
                        "tokens": tokens,
                        "mcp_calls": facts.mcp_calls,
                    }
                )
            finally:
                execution.reset(context)
                services.capacity.release()

    @app.post("/api/v1/agent/runs", response_model=AgentRun, status_code=201)
    async def run(body: RunRequest) -> JSONResponse:
        result = await execute(body)
        return JSONResponse(
            status_code=201,
            content=result.model_dump(mode="json"),
            headers={"X-Request-ID": result.id},
        )

    @app.post("/api/v1/agent/runs/stream")
    async def stream(body: RunRequest) -> StreamingResponse:
        async def events() -> AsyncIterator[str]:
            queue: asyncio.Queue[dict[str, object]] = asyncio.Queue()

            async def on_step(step: TraceStep) -> None:
                await queue.put({"type": "step", "data": step.model_dump()})

            async def produce() -> None:
                try:
                    result = await execute(body, on_step)
                    await queue.put({"type": "result", "data": result.model_dump(mode="json")})
                except HTTPException as exc:
                    await queue.put({"type": "error", "data": str(exc.detail)})
                except Exception:
                    await queue.put(
                        {"type": "error", "data": "The workflow could not complete. Please retry."}
                    )

            task = asyncio.create_task(produce())
            try:
                while True:
                    event = await queue.get()
                    yield json.dumps(event) + "\n"
                    if event["type"] in ("result", "error"):
                        break
            finally:
                if not task.done():
                    task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

        return StreamingResponse(
            events(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.get("/api/v1/agent/runs/{run_id}", response_model=AgentRun)
    def get_run(run_id: str, services: Services) -> AgentRun:
        return services.repository.get_run(run_id)

    @app.get("/api/v1/agent/runs/{run_id}/report")
    def report(run_id: str, services: Services) -> Response:
        payload = services.reports.generate(run_id)
        return Response(
            payload,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="autonex-{run_id}.pdf"'},
        )

    @app.post("/api/v1/service-centers/search")
    async def service_centers(body: ServiceSearch, services: Services) -> object:
        async with Client(services.mcp, raise_exceptions=True) as client:
            result = await client.call_tool("search_service_centers", {"query": body.query})
        return result.structured_content

    @app.post("/api/v1/service-requests/demo")
    async def service_demo(body: ServiceDemo, services: Services) -> object:
        services.repository.get_vehicle(body.vehicle_id)
        async with Client(services.mcp, raise_exceptions=True) as client:
            result = await client.call_tool("demonstrate_service_request", body.model_dump())
        return result.structured_content

    @app.post("/api/v1/test-drives", response_model=TestDriveReceipt, status_code=201)
    def test_drive(body: TestDriveRequest, services: Services) -> TestDriveReceipt:
        services.repository.get_vehicle(body.vehicle_id)
        if body.preferred_date < datetime.now(UTC).date():
            raise HTTPException(422, "Choose today or a future date.")
        return TestDriveReceipt(id=services.repository.save_test_drive(body))

    app.mount("/mcp", mcp_app)
    return app
