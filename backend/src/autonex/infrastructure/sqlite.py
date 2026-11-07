"""SQLite adapters; one short-lived connection per unit of work."""

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from uuid import uuid4

from autonex.domain.models import AgentRun, TestDriveRequest, Vehicle
from autonex.domain.services import NotFoundError


class SQLiteRepository:
    def __init__(self, database_path: Path, catalog_path: Path) -> None:
        self.path = database_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS test_drives (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
            """)
            for raw in json.loads(catalog_path.read_text()):
                vehicle = Vehicle.model_validate(raw)
                db.execute(
                    "INSERT INTO vehicles VALUES (?, ?) "
                    "ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
                    (vehicle.id, vehicle.model_dump_json()),
                )

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def list_vehicles(self) -> list[Vehicle]:
        with self.connect() as db:
            rows = db.execute("SELECT payload FROM vehicles ORDER BY id").fetchall()
        return [Vehicle.model_validate_json(row[0]) for row in rows]

    def get_vehicle(self, vehicle_id: str) -> Vehicle:
        with self.connect() as db:
            row = db.execute("SELECT payload FROM vehicles WHERE id = ?", (vehicle_id,)).fetchone()
        if row is None:
            raise NotFoundError("Vehicle not found.")
        return Vehicle.model_validate_json(row[0])

    def save_run(self, run: AgentRun) -> None:
        with self.connect() as db:
            db.execute("INSERT INTO runs VALUES (?, ?)", (run.id, run.model_dump_json()))

    def get_run(self, run_id: str) -> AgentRun:
        with self.connect() as db:
            row = db.execute("SELECT payload FROM runs WHERE id = ?", (run_id,)).fetchone()
        if row is None:
            raise NotFoundError("Run not found.")
        return AgentRun.model_validate_json(row[0])

    def save_test_drive(self, request: TestDriveRequest) -> str:
        lead_id = str(uuid4())
        with self.connect() as db:
            db.execute(
                "INSERT INTO test_drives VALUES (?, ?)", (lead_id, request.model_dump_json())
            )
        return lead_id

    def record_operation(self, record: dict[str, Any]) -> None:
        with self.connect() as db:
            db.execute("INSERT INTO operations VALUES (?, ?)", (record["id"], json.dumps(record)))

    def operations(self) -> dict[str, Any]:
        # Aggregate in SQL and materialize only the 50 records shown by the UI.
        with self.connect() as db:
            db.row_factory = sqlite3.Row
            summary = dict(
                db.execute("""
                SELECT COUNT(*) AS total,
                    COALESCE(SUM(
                        json_extract(payload, '$.status') = 'successful'
                    ), 0) AS successful,
                    COALESCE(SUM(json_extract(payload, '$.status') = 'failed'), 0) AS failed,
                    COALESCE(SUM(json_extract(payload, '$.retries')), 0) AS retries,
                    COALESCE(AVG(json_extract(payload, '$.duration_ms')), 0) AS latency_ms,
                    COALESCE(SUM(json_extract(payload, '$.tokens')), 0) AS tokens,
                    COALESCE(SUM(json_extract(payload, '$.mcp_calls')), 0) AS mcp_calls
                FROM operations
            """).fetchone()
            )
            rows = db.execute(
                "SELECT payload FROM operations ORDER BY rowid DESC LIMIT 50"
            ).fetchall()
        return summary | {"recent": [json.loads(row[0]) for row in rows]}
