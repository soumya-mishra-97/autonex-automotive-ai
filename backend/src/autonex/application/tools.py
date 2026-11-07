"""Shared read-only use cases exposed to agents and protocol adapters."""

from typing import Protocol

from autonex.application.ports import KnowledgeRepository, VehicleRepository
from autonex.domain.models import Configuration, Quote, Source, Vehicle
from autonex.domain.services import price_configuration


class AgentTools(Protocol):
    async def catalog(self) -> list[Vehicle]: ...
    async def search(self, query: str, vehicle_id: str | None) -> list[Source]: ...
    async def quote(self, configuration: Configuration) -> Quote: ...


class CatalogTools:
    def __init__(self, vehicles: VehicleRepository, knowledge: KnowledgeRepository) -> None:
        self.vehicles = vehicles
        self.knowledge = knowledge

    def catalog(self) -> list[Vehicle]:
        return self.vehicles.list_vehicles()

    async def search(self, query: str, vehicle_id: str | None = None) -> list[Source]:
        return await self.knowledge.search(query, vehicle_id)

    def quote(self, configuration: Configuration) -> Quote:
        return price_configuration(
            self.vehicles.get_vehicle(configuration.vehicle_id), configuration
        )
