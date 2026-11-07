import pytest
from mcp import Client

from autonex.api.app import create_app
from autonex.domain.models import (
    Configuration,
    Explanation,
    Intent,
    Quote,
    RunRequest,
    Source,
    Vehicle,
)
from autonex.domain.services import ProviderError, default_configuration
from autonex.infrastructure.llm import DemoLanguageModel
from autonex.infrastructure.settings import Settings
from autonex.infrastructure.sqlite import SQLiteRepository


class ForeignVehicleModel(DemoLanguageModel):
    async def configure(
        self, request: RunRequest, intent: Intent, vehicles: list[Vehicle], sources: list[Source]
    ) -> Configuration:
        return default_configuration(vehicles[0]).model_copy(update={"vehicle_id": "unlisted-car"})


class FabricatedSourceModel(DemoLanguageModel):
    async def explain(
        self, request: RunRequest, vehicle: Vehicle, quote: Quote, sources: list[Source]
    ) -> Explanation:
        return Explanation(
            summary="An invented answer",
            rationale="Invented evidence",
            source_ids=["fabricated-source"],
        )


@pytest.mark.parametrize("model", [ForeignVehicleModel(), FabricatedSourceModel()])
async def test_master_rejects_unlisted_vehicles_and_fabricated_citations(
    settings: Settings, model: DemoLanguageModel
) -> None:
    app = create_app(settings, model)
    with pytest.raises(ProviderError):
        await app.state.container.master.run(RunRequest(prompt="A blue sporty car"))


async def test_mcp_client_discovers_and_calls_the_read_only_catalog_tools(
    settings: Settings, repository: SQLiteRepository
) -> None:
    server = create_app(settings).state.container.mcp
    async with Client(server) as client:
        listing = await client.list_tools()
        assert {tool.name for tool in listing.tools} == {
            "list_vehicles",
            "search_knowledge",
            "quote_configuration",
            "get_vehicle_specifications",
            "search_service_centers",
            "demonstrate_service_request",
        }
        assert all(tool.annotations.read_only_hint for tool in listing.tools)
        result = await client.call_tool(
            "quote_configuration",
            {
                "configuration": default_configuration(
                    repository.get_vehicle("bmw-i4-demo")
                ).model_dump()
            },
        )
        assert not result.is_error
        assert result.structured_content["total"] == 58900
