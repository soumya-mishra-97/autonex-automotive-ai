import json
from pathlib import Path

from fastapi.testclient import TestClient

from autonex.api.app import create_app
from autonex.domain.services import ProviderError
from autonex.infrastructure.database import SQLAlchemyRepository
from autonex.infrastructure.llm import DemoLanguageModel
from autonex.infrastructure.settings import Settings


def test_stream_emits_actual_steps_then_result_and_records_metrics(client: TestClient) -> None:
    assert client.get("/api/v1/operations").json()["total"] == 0
    response = client.post("/api/v1/agent/runs/stream", json={"prompt": "A sporty blue car"})
    events = [json.loads(line) for line in response.text.splitlines()]
    assert [event["data"]["node"] for event in events[:-1]] == [
        "master",
        "understanding",
        "research",
        "specialist",
        "tools",
        "validation",
        "synthesis",
    ]
    assert events[-1]["type"] == "result"
    stats = client.get("/api/v1/operations").json()
    assert stats["total"] == stats["successful"] == 1
    assert stats["failed"] == stats["retries"] == stats["tokens"] == 0
    assert stats["mcp_calls"] == 3
    assert stats["latency_ms"] >= 0
    assert stats["recent"][0]["prompt"] == "A sporty blue car"
    result = events[-1]["data"]
    assert client.get(f"/api/v1/agent/runs/{result['id']}").json() == result


class OnceFailingModel(DemoLanguageModel):
    attempts = 0

    async def plan(self, request):
        self.attempts += 1
        if self.attempts == 1:
            raise ProviderError("transient error")
        return await super().plan(request)


def test_retries_are_bounded_and_reported(settings: Settings) -> None:
    model = OnceFailingModel()
    with TestClient(create_app(settings, model)) as client:
        result = client.post("/api/v1/agent/runs", json={"prompt": "A family car"})
        assert result.status_code == 201
        assert model.attempts == 2
        assert result.json()["trace"][1]["retries"] == 1
        assert client.get("/api/v1/operations").json()["retries"] == 1


class AlwaysFailingModel(DemoLanguageModel):
    attempts = 0

    async def plan(self, request):
        self.attempts += 1
        raise ProviderError("private provider diagnostics")


def test_failed_stream_is_sanitized_audited_and_releases_capacity(settings: Settings) -> None:
    model = AlwaysFailingModel()
    with TestClient(create_app(settings, model)) as client:
        response = client.post("/api/v1/agent/runs/stream", json={"prompt": "Find a car"})
        events = [json.loads(line) for line in response.text.splitlines()]
        assert events[-1]["type"] == "error"
        assert "private" not in response.text
        assert model.attempts == 2
        stats = client.get("/api/v1/operations").json()
        assert stats["total"] == stats["failed"] == stats["retries"] == 1
        assert client.app.state.container.capacity._value == settings.max_concurrent_runs


def test_report_has_pdf_response_and_rejects_unknown_runs(client: TestClient) -> None:
    run = client.post("/api/v1/agent/runs", json={"prompt": "A sporty car <script> & demo"}).json()
    response = client.get(f"/api/v1/agent/runs/{run['id']}/report")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")
    assert "autonex-" in response.headers["content-disposition"]
    assert client.get("/api/v1/agent/runs/unknown/report").status_code == 404


def test_sqlalchemy_adapter_survives_recreation_and_scopes_identity(
    settings: Settings, tmp_path: Path
) -> None:
    url = f"sqlite:///{tmp_path / 'sqlalchemy.sqlite3'}"
    repository = SQLAlchemyRepository(url, settings.catalog_path, initialize=True)
    assert len(repository.list_vehicles()) == 3
    assert repository.get_vehicle("bmw-i4-demo").name == "BMW i4"
    repository.record_operation(
        {
            "id": "run-1",
            "created_at": "2026-11-07",
            "status": "successful",
            "prompt": "demo",
            "duration_ms": 25,
            "tokens": 0,
            "retries": 0,
            "mcp_calls": 3,
        }
    )
    repository.engine.dispose()
    recreated = SQLAlchemyRepository(url, settings.catalog_path)
    assert recreated.operations()["total"] == 1
    assert recreated.operations()["mcp_calls"] == 3
    recreated.engine.dispose()


def test_service_http_adapter_uses_safe_mcp_fixtures(client: TestClient) -> None:
    centers = client.post("/api/v1/service-centers/search", json={"query": "nearby"})
    assert centers.status_code == 200
    assert centers.json()["demo"] is True
    assert centers.json()["centers"][0]["location"] == "Virtual only"
    receipt = client.post(
        "/api/v1/service-requests/demo",
        json={"vehicle_id": "bmw-i4-demo", "service": "Routine maintenance"},
    )
    assert receipt.status_code == 200
    assert receipt.json()["status"] == "simulated"
    assert receipt.json()["booking_created"] is False
    assert (
        client.post(
            "/api/v1/service-requests/demo", json={"vehicle_id": "unknown", "service": "inspection"}
        ).status_code
        == 404
    )
    assert (
        client.post("/api/v1/service-centers/search", json={"query": "x" * 201}).status_code == 422
    )


def test_ambiguous_requests_clarify_and_bmw_entities_are_scoped(client: TestClient) -> None:
    unclear = client.post("/api/v1/agent/runs", json={"prompt": "Help"}).json()
    assert unclear["needs_clarification"] is True
    assert "Would you like" in unclear["rationale"]
    scoped = client.post("/api/v1/agent/runs", json={"prompt": "Explain BMW iX power"}).json()
    assert scoped["quote"]["configuration"]["vehicle_id"] == "bmw-ix-demo"
    assert all(source["document_id"] != "gt" for source in scoped["sources"])
    assert any(source["version"] and source["url"] for source in scoped["sources"])


def test_metrics_keep_all_time_totals_but_bound_recent_records(
    settings: Settings, tmp_path: Path
) -> None:
    from autonex.infrastructure.sqlite import SQLiteRepository

    repositories = [
        SQLiteRepository(tmp_path / "bounded.sqlite3", settings.catalog_path),
        SQLAlchemyRepository(
            f"sqlite:///{tmp_path / 'bounded-sqlalchemy.sqlite3'}",
            settings.catalog_path,
            initialize=True,
        ),
    ]
    for repository in repositories:
        for index in range(120):
            repository.record_operation(
                {
                    "id": f"run-{index:03}",
                    "created_at": f"2026-11-07T00:{index:03}",
                    "status": "successful" if index % 2 else "failed",
                    "prompt": "demo",
                    "duration_ms": 20,
                    "tokens": 2,
                    "retries": 1,
                    "mcp_calls": 3,
                }
            )
        stats = repository.operations()
        assert stats["total"] == 120
        assert stats["successful"] == stats["failed"] == 60
        assert stats["retries"] == 120
        assert stats["tokens"] == 240
        assert stats["mcp_calls"] == 360
        assert stats["latency_ms"] == 20
        assert len(stats["recent"]) == 50
        assert stats["recent"][0]["id"] == "run-119"
        if isinstance(repository, SQLAlchemyRepository):
            repository.engine.dispose()


def test_xuv_is_marked_default_and_gwagon_prompts_use_scoped_evidence(client: TestClient) -> None:
    catalog = client.get("/api/v1/vehicles").json()
    assert [vehicle["id"] for vehicle in catalog if vehicle["is_default"]] == ["autonex-xuv-demo"]
    run = client.post(
        "/api/v1/agent/runs", json={"prompt": "A fast black G-Wagon inspired XUV under $150k"}
    ).json()
    assert run["quote"]["configuration"]["vehicle_id"] == "autonex-xuv-demo"
    assert run["quote"]["total"] == 110800
    assert any(source["document_id"] == "xuv" for source in run["sources"])
    assert all(source["document_id"] in ("xuv", "ownership") for source in run["sources"])
    followup = client.post(
        "/api/v1/agent/runs",
        json={
            "prompt": "Switch to a BMW i4",
            "history": [{"role": "user", "content": "Show the XUV"}],
        },
    ).json()
    assert followup["quote"]["configuration"]["vehicle_id"] == "bmw-i4-demo"
