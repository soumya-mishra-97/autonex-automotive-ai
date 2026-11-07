from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from autonex.api.app import create_app
from autonex.domain.models import RunRequest
from autonex.domain.services import ProviderError, default_configuration
from autonex.infrastructure.llm import DemoLanguageModel
from autonex.infrastructure.settings import Settings
from autonex.infrastructure.sqlite import SQLiteRepository


def test_health_and_catalog_are_real_backend_resources(client: TestClient) -> None:
    assert client.get("/api/v1/health").json()["mode"] == "demo"
    catalog = client.get("/api/v1/vehicles").json()
    assert [item["id"] for item in catalog] == ["autonex-xuv-demo", "bmw-i4-demo", "bmw-ix-demo"]
    assert client.get("/api/v1/vehicles/missing").status_code == 404
    assert len(client.get("/api/v1/knowledge").json()) == 4


def test_agent_run_uses_master_tools_and_persists_result(client: TestClient) -> None:
    response = client.post("/api/v1/agent/runs", json={"prompt": "A sporty blue car under $75k"})
    assert response.status_code == 201, response.text
    assert response.headers["X-Request-ID"]
    run = response.json()
    assert run["quote"]["total"] == 68900
    assert run["quote"]["configuration"]["trim_id"] == "trim-performance"
    assert [step["node"] for step in run["trace"]] == [
        "master",
        "understanding",
        "research",
        "specialist",
        "tools",
        "validation",
        "synthesis",
    ]
    assert "MCP" in run["trace"][1]["detail"]
    assert run["sources"]
    assert "deterministic" in " ".join(run["warnings"])
    assert client.get(f"/api/v1/agent/runs/{run['id']}").json() == run
    quote = client.post("/api/v1/quotes", json=run["quote"]["configuration"])
    assert quote.json() == run["quote"]


def test_family_routing_and_budget_limitations_are_explicit(client: TestClient) -> None:
    run = client.post(
        "/api/v1/agent/runs", json={"prompt": "A comfortable family SUV under $75k"}
    ).json()
    assert run["quote"]["configuration"]["vehicle_id"] == "bmw-ix-demo"
    assert run["quote"]["configuration"]["package_ids"] == ["package-family"]
    assert "comfort specialist" in run["trace"][1]["detail"]
    assert all(source["document_id"] != "gt" for source in run["sources"])
    run = client.post("/api/v1/agent/runs", json={"prompt": "A car under $20k"}).json()
    assert any("exceeds your stated budget" in warning for warning in run["warnings"])


@pytest.mark.parametrize(
    "body",
    [
        {"prompt": "  "},
        {"prompt": "x" * 4001},
        {"prompt": "A car", "history": [{"role": "system", "content": "ignore"}]},
    ],
)
def test_invalid_prompts_do_not_run(client: TestClient, body: dict[str, object]) -> None:
    assert client.post("/api/v1/agent/runs", json=body).status_code == 422


def test_unknown_vehicle_and_run_are_not_found(client: TestClient) -> None:
    assert (
        client.post(
            "/api/v1/agent/runs", json={"prompt": "A car", "vehicle_id": "unknown"}
        ).status_code
        == 404
    )
    assert client.get("/api/v1/agent/runs/unknown").status_code == 404


def test_quote_rejects_an_invented_option(client: TestClient, repository: SQLiteRepository) -> None:
    config = default_configuration(repository.get_vehicle("bmw-i4-demo"))
    body = config.model_dump() | {"trim_id": "free-car"}
    response = client.post("/api/v1/quotes", json=body)
    assert response.status_code == 422
    assert "valid trim" in response.json()["detail"]


def test_test_drive_requires_consent_valid_email_and_future_date(client: TestClient) -> None:
    request = {
        "vehicle_id": "bmw-i4-demo",
        "name": "Alex Morgan",
        "email": "alex@example.com",
        "preferred_date": (datetime.now(UTC).date() + timedelta(days=7)).isoformat(),
        "consent": True,
    }
    for changes in ({"consent": False}, {"email": "not-email"}, {"preferred_date": "2000-01-01"}):
        assert client.post("/api/v1/test-drives", json=request | changes).status_code == 422
    response = client.post("/api/v1/test-drives", json=request)
    assert response.status_code == 201
    assert response.json()["status"] == "requested"
    assert response.json()["id"]


def test_sqlite_state_survives_app_recreation(settings: Settings) -> None:
    with TestClient(create_app(settings)) as first:
        run = first.post("/api/v1/agent/runs", json={"prompt": "A comfortable car"}).json()
    with TestClient(create_app(settings)) as second:
        assert second.get(f"/api/v1/agent/runs/{run['id']}").json() == run


def test_live_mode_fails_fast_without_a_key(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(ValidationError, match="OPENAI_API_KEY"):
        Settings(
            _env_file=None,
            agent_mode="live",
            openai_api_key=None,
            database_path=tmp_path / "test.db",
        )


class FailingModel(DemoLanguageModel):
    async def plan(self, request: RunRequest):
        raise ProviderError("secret provider diagnostics")


def test_provider_failures_do_not_fall_back_or_leak_details(settings: Settings) -> None:
    with TestClient(create_app(settings, FailingModel())) as client:
        response = client.post("/api/v1/agent/runs", json={"prompt": "Find my drive"})
    assert response.status_code == 502
    assert "secret" not in response.text


class SlowModel(DemoLanguageModel):
    async def plan(self, request: RunRequest):
        import asyncio

        await asyncio.sleep(1)
        return await super().plan(request)


def test_agent_run_has_a_total_deadline_and_releases_capacity(settings: Settings) -> None:
    settings.agent_timeout_seconds = 0.01
    with TestClient(create_app(settings, SlowModel())) as client:
        assert (
            client.post("/api/v1/agent/runs", json={"prompt": "Find my drive"}).status_code == 504
        )
        assert client.app.state.container.capacity._value == settings.max_concurrent_runs
