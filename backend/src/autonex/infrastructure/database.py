"""SQLAlchemy adapter for PostgreSQL and SQLite. Same application ports as local storage."""

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, Column, MetaData, String, Table, case, create_engine, func, select
from sqlalchemy.engine import Engine

from autonex.domain.models import AgentRun, TestDriveRequest, Vehicle
from autonex.domain.services import NotFoundError

metadata = MetaData()
vehicles = Table(
    "vehicles",
    metadata,
    Column("id", String, primary_key=True),
    Column("payload", JSON, nullable=False),
)
runs = Table(
    "runs",
    metadata,
    Column("id", String, primary_key=True),
    Column("payload", JSON, nullable=False),
)
leads = Table(
    "test_drives",
    metadata,
    Column("id", String, primary_key=True),
    Column("payload", JSON, nullable=False),
)
operations = Table(
    "operations",
    metadata,
    Column("id", String, primary_key=True),
    Column("payload", JSON, nullable=False),
)


class SQLAlchemyRepository:
    def __init__(self, url: str, catalog_path: Path, *, initialize: bool = False) -> None:
        self.engine: Engine = create_engine(url, pool_pre_ping=True)
        if initialize:
            metadata.create_all(self.engine)
        with self.engine.begin() as connection:
            for raw in json.loads(catalog_path.read_text()):
                vehicle = Vehicle.model_validate(raw)
                if connection.execute(
                    select(vehicles.c.id).where(vehicles.c.id == vehicle.id)
                ).first():
                    connection.execute(
                        vehicles.update()
                        .where(vehicles.c.id == vehicle.id)
                        .values(payload=vehicle.model_dump(mode="json"))
                    )
                else:
                    connection.execute(
                        vehicles.insert().values(
                            id=vehicle.id, payload=vehicle.model_dump(mode="json")
                        )
                    )

    def list_vehicles(self) -> list[Vehicle]:
        with self.engine.connect() as connection:
            return [
                Vehicle.model_validate(row[0])
                for row in connection.execute(select(vehicles.c.payload).order_by(vehicles.c.id))
            ]

    def _get(self, table: Table, key: str) -> Any:
        with self.engine.connect() as connection:
            row = connection.execute(select(table.c.payload).where(table.c.id == key)).first()
        if row is None:
            raise NotFoundError("Resource not found.")
        return row[0]

    def get_vehicle(self, vehicle_id: str) -> Vehicle:
        return Vehicle.model_validate(self._get(vehicles, vehicle_id))

    def save_run(self, run: AgentRun) -> None:
        with self.engine.begin() as connection:
            connection.execute(runs.insert().values(id=run.id, payload=run.model_dump(mode="json")))

    def get_run(self, run_id: str) -> AgentRun:
        return AgentRun.model_validate(self._get(runs, run_id))

    def save_test_drive(self, request: TestDriveRequest) -> str:
        key = str(uuid4())
        with self.engine.begin() as connection:
            connection.execute(
                leads.insert().values(id=key, payload=request.model_dump(mode="json"))
            )
        return key

    def record_operation(self, record: dict[str, Any]) -> None:
        with self.engine.begin() as connection:
            connection.execute(operations.insert().values(id=record["id"], payload=record))

    def operations(self) -> dict[str, Any]:
        payload = operations.c.payload
        query = select(
            func.count().label("total"),
            func.coalesce(
                func.sum(case((payload["status"].as_string() == "successful", 1), else_=0)), 0
            ).label("successful"),
            func.coalesce(
                func.sum(case((payload["status"].as_string() == "failed", 1), else_=0)), 0
            ).label("failed"),
            *(
                func.coalesce(func.sum(payload[key].as_integer()), 0).label(key)
                for key in ("retries", "tokens", "mcp_calls")
            ),
            func.coalesce(func.avg(payload["duration_ms"].as_integer()), 0).label("latency_ms"),
        ).select_from(operations)
        with self.engine.connect() as connection:
            summary = dict(connection.execute(query).mappings().one())
            recent = [
                row[0]
                for row in connection.execute(
                    select(payload)
                    .order_by(payload["created_at"].as_string().desc(), operations.c.id.desc())
                    .limit(50)
                )
            ]
        return summary | {"recent": recent}
