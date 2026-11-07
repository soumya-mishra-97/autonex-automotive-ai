from pathlib import Path
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    agent_mode: Literal["demo", "live"] = "demo"
    openai_api_key: SecretStr | None = None
    llm_model: str = "gpt-4.1-mini"
    embedding_model: str = "text-embedding-3-small"
    database_url: str | None = None
    llm_base_url: str | None = None
    tracing_enabled: bool = False
    vector_dimensions: int = 1536
    database_path: Path = BACKEND_ROOT / "var" / "autonex.sqlite3"
    catalog_path: Path = BACKEND_ROOT / "data" / "vehicles.json"
    knowledge_path: Path = BACKEND_ROOT / "knowledge"
    vector_cache_path: Path = BACKEND_ROOT / "var" / "vectors.json"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    agent_timeout_seconds: float = 90
    max_concurrent_runs: int = 4

    @model_validator(mode="after")
    def validate_live_mode(self) -> "Settings":
        if self.agent_mode == "live" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when AGENT_MODE=live.")
        if self.max_concurrent_runs < 1 or self.agent_timeout_seconds <= 0:
            raise ValueError("Concurrency and timeout must be positive.")
        return self
