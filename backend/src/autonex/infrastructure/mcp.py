"""MCP transport adapters. The master uses an actual in-process MCP client.

The same server is exposed over Streamable HTTP for external MCP hosts.
No recursive HTTP calls, subprocesses, arbitrary URLs, or write tools are needed.
"""

from mcp import Client, types
from mcp.server import MCPServer
from pydantic import BaseModel

from autonex.application.telemetry import current_execution
from autonex.application.tools import CatalogTools
from autonex.domain.models import Configuration, Quote, Source, Vehicle
from autonex.domain.services import ProviderError


class CatalogResult(BaseModel):
    vehicles: list[Vehicle]


class SearchResult(BaseModel):
    sources: list[Source]


def create_mcp_server(tools: CatalogTools) -> MCPServer:
    server = MCPServer(
        "AUTONEX mock automotive tools",
        instructions=(
            "Demonstration data only. No official BMW access. Service actions are simulations."
        ),
    )
    annotations = types.ToolAnnotations(
        read_only_hint=True, destructive_hint=False, open_world_hint=False
    )

    @server.tool(annotations=annotations)
    def list_vehicles() -> CatalogResult:
        """List the supported vehicles, valid configuration options and catalog prices."""
        return CatalogResult(vehicles=tools.catalog())

    @server.tool(annotations=annotations)
    async def search_knowledge(query: str, vehicle_id: str | None = None) -> SearchResult:
        """Retrieve evidence from curated ownership and vehicle documents."""
        return SearchResult(sources=await tools.search(query[:4000], vehicle_id))

    @server.tool(annotations=annotations)
    def quote_configuration(configuration: Configuration) -> Quote:
        """Validate a configuration and calculate its authoritative USD estimate."""
        return tools.quote(configuration)

    @server.tool(annotations=annotations)
    def get_vehicle_specifications(vehicle_id: str) -> Vehicle:
        """Read structured demo specifications. Not live manufacturer data."""
        return tools.vehicles.get_vehicle(vehicle_id)

    @server.tool(annotations=annotations)
    def search_service_centers(query: str) -> dict[str, object]:
        """Search safe virtual service-center fixtures; no real locations or availability."""
        return {
            "demo": True,
            "query": query[:200],
            "centers": [
                {
                    "id": "virtual-autonex",
                    "name": "AUTONEX Demonstration Center",
                    "location": "Virtual only",
                }
            ],
        }

    @server.tool(annotations=annotations)
    def demonstrate_service_request(vehicle_id: str, service: str) -> dict[str, object]:
        """Return a service simulation. Does not persist, book, message or contact anyone."""
        tools.vehicles.get_vehicle(vehicle_id)
        return {
            "demo": True,
            "status": "simulated",
            "vehicle_id": vehicle_id,
            "service": service[:200],
            "booking_created": False,
        }

    return server


class MCPAgentTools:
    def __init__(self, server: MCPServer) -> None:
        self.server = server

    async def catalog(self) -> list[Vehicle]:
        current_execution().mcp_calls += 1
        async with Client(self.server, raise_exceptions=True) as client:
            result = await client.call_tool("list_vehicles")
        if result.is_error:
            raise ProviderError("Catalog tool failed.")
        return CatalogResult.model_validate(result.structured_content).vehicles

    async def search(self, query: str, vehicle_id: str | None) -> list[Source]:
        current_execution().mcp_calls += 1
        async with Client(self.server, raise_exceptions=True) as client:
            result = await client.call_tool(
                "search_knowledge", {"query": query, "vehicle_id": vehicle_id}
            )
        if result.is_error:
            raise ProviderError("Knowledge tool failed.")
        return SearchResult.model_validate(result.structured_content).sources

    async def quote(self, configuration: Configuration) -> Quote:
        current_execution().mcp_calls += 1
        async with Client(self.server, raise_exceptions=True) as client:
            result = await client.call_tool(
                "quote_configuration", {"configuration": configuration.model_dump()}
            )
        if result.is_error:
            raise ProviderError("Pricing tool rejected the configuration.")
        return Quote.model_validate(result.structured_content)
