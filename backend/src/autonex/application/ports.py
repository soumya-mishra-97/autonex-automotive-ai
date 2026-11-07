"""Small ports keep use cases independent of infrastructure implementations."""

from typing import Protocol

from autonex.domain.models import (
    AgentRun,
    Configuration,
    Explanation,
    Intent,
    KnowledgeDocument,
    Quote,
    RunRequest,
    Source,
    TestDriveRequest,
    Vehicle,
)


class VehicleRepository(Protocol):
    def list_vehicles(self) -> list[Vehicle]: ...
    def get_vehicle(self, vehicle_id: str) -> Vehicle: ...


class RunRepository(Protocol):
    def save_run(self, run: AgentRun) -> None: ...
    def get_run(self, run_id: str) -> AgentRun: ...


class LeadRepository(Protocol):
    def save_test_drive(self, request: TestDriveRequest) -> str: ...


class KnowledgeRepository(Protocol):
    def documents(self) -> list[KnowledgeDocument]: ...
    async def search(self, query: str, vehicle_id: str | None = None) -> list[Source]: ...


class LanguageModel(Protocol):
    async def plan(self, request: RunRequest) -> Intent: ...
    async def configure(
        self,
        request: RunRequest,
        intent: Intent,
        vehicles: list[Vehicle],
        sources: list[Source],
    ) -> Configuration: ...
    async def explain(
        self,
        request: RunRequest,
        vehicle: Vehicle,
        quote: Quote,
        sources: list[Source],
    ) -> Explanation: ...
