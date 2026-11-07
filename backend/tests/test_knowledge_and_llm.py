import re

import pytest
from langchain_core.embeddings import Embeddings
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from autonex.domain.models import Intent, RunRequest
from autonex.domain.services import ProviderError
from autonex.infrastructure.knowledge import DocumentKnowledgeRepository
from autonex.infrastructure.llm import LangChainLanguageModel
from autonex.infrastructure.settings import Settings


async def test_demo_retrieval_filters_other_vehicles_and_handles_no_matches(
    settings: Settings,
) -> None:
    knowledge = DocumentKnowledgeRepository(settings)
    sources = await knowledge.search("family seating", "bmw-ix-demo")
    assert sources
    assert all(source.document_id != "gt" for source in sources)
    assert await knowledge.search("zzzzunmatchedwordzzzz", "bmw-i4-demo") == []


class TestEmbeddings(Embeddings):
    __test__ = False

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        words = set(re.findall(r"[a-z]+", text.lower()))
        return [
            float(len(words & group))
            for group in (
                {"family", "seating", "suv"},
                {"performance", "sport", "gt"},
                {"charge", "charging", "battery"},
            )
        ] + [0.01]


async def test_live_semantic_index_is_cached_and_scoped_without_network(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "autonex.infrastructure.knowledge.OpenAIEmbeddings", lambda **kwargs: TestEmbeddings()
    )
    settings.agent_mode = "live"
    settings.openai_api_key = SecretStr("test-not-a-real-key")
    first = DocumentKnowledgeRepository(settings)
    sources = await first.search("family seating", "bmw-ix-demo")
    assert sources and all(source.document_id != "gt" for source in sources)
    assert list(settings.vector_cache_path.parent.glob("vectors-*.json"))
    second = DocumentKnowledgeRepository(settings)
    assert [source.id for source in await second.search("family seating", "bmw-ix-demo")] == [
        source.id for source in sources
    ]


async def test_langchain_uses_strict_structured_output_and_preserves_user_input_as_data(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = []
    intent = Intent(
        priority="value", body="any", color="blue", budget=60000, retrieval_query="electric range"
    )

    def structured(self, schema, **kwargs):
        calls.append((schema, kwargs))
        return RunnableLambda(lambda messages: intent)

    monkeypatch.setattr(ChatOpenAI, "with_structured_output", structured)
    settings.openai_api_key = SecretStr("test-not-a-real-key")
    adapter = LangChainLanguageModel(settings)
    result = await adapter.plan(RunRequest(prompt="A blue car under $60k"))
    assert result == intent
    assert calls == [(Intent, {"method": "json_schema", "strict": True})]


async def test_langchain_failure_is_a_sanitized_provider_error(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(self, schema, **kwargs):
        raise RuntimeError("sk-secret-provider-detail")

    monkeypatch.setattr(ChatOpenAI, "with_structured_output", broken)
    settings.openai_api_key = SecretStr("test-not-a-real-key")
    with pytest.raises(ProviderError, match="could not complete"):
        await LangChainLanguageModel(settings).plan(RunRequest(prompt="Find a car"))
