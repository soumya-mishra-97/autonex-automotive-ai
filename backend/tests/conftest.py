from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from autonex.api.app import create_app
from autonex.infrastructure.settings import Settings
from autonex.infrastructure.sqlite import SQLiteRepository


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        agent_mode="demo",
        database_path=tmp_path / "test.sqlite3",
        vector_cache_path=tmp_path / "vectors.json",
    )


@pytest.fixture
def repository(settings: Settings) -> SQLiteRepository:
    return SQLiteRepository(settings.database_path, settings.catalog_path)


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as value:
        yield value
