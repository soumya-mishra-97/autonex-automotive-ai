"""Request-scoped facts shared by tool and provider adapters."""

from contextvars import ContextVar
from dataclasses import dataclass


@dataclass
class ExecutionFacts:
    retries: int = 0
    mcp_calls: int = 0


execution: ContextVar[ExecutionFacts] = ContextVar("execution")


def current_execution() -> ExecutionFacts:
    try:
        return execution.get()
    except LookupError:
        facts = ExecutionFacts()
        execution.set(facts)
        return facts
