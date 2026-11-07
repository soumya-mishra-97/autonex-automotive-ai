"""Chunked local documents; lexical demo retrieval or cached semantic live retrieval."""

import asyncio
import hashlib
import re

from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from autonex.domain.models import KnowledgeDocument, Source
from autonex.infrastructure.settings import Settings


class DocumentKnowledgeRepository:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._documents = [
            KnowledgeDocument(
                id=path.stem,
                title=path.read_text().splitlines()[0].lstrip("# "),
                content=path.read_text(),
                vehicle_id={
                    "gt": "bmw-i4-demo",
                    "suv": "bmw-ix-demo",
                    "xuv": "autonex-xuv-demo",
                }.get(path.stem),
                version=hashlib.sha256(path.read_bytes()).hexdigest()[:12],
                url={
                    "gt": "https://newsroom.bmwgroup.com/americas/2026-bmw-i4-update-measures",
                    "suv": "https://newsroom.bmwgroup.com/americas/the-new-bmw-ix",
                }.get(path.stem),
            )
            for path in sorted(settings.knowledge_path.glob("*.md"))
        ]
        splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
        self.chunks: list[Document] = []
        sections = MarkdownHeaderTextSplitter(
            headers_to_split_on=[("#", "document"), ("##", "section")], strip_headers=False
        )
        for doc in self._documents:
            pieces = splitter.split_documents(sections.split_text(doc.content))
            for index, piece in enumerate(pieces):
                self.chunks.append(
                    Document(
                        page_content=piece.page_content,
                        metadata={
                            "id": f"{doc.id}-{doc.version}-{index}",
                            "document_id": doc.id,
                            "title": doc.title
                            + (
                                " / " + piece.metadata["section"]
                                if "section" in piece.metadata
                                else ""
                            ),
                            "vehicle_id": doc.vehicle_id,
                            "version": doc.version,
                            "url": doc.url
                            if piece.metadata.get("section") == "Public BMW reference notes"
                            else None,
                        },
                    )
                )
        self.store: InMemoryVectorStore | None = None
        self._lock = asyncio.Lock()

    def documents(self) -> list[KnowledgeDocument]:
        return self._documents

    async def _vector_store(self) -> InMemoryVectorStore:
        async with self._lock:
            if self.store is not None:
                return self.store
            key = self.settings.openai_api_key
            embeddings = OpenAIEmbeddings(
                model=self.settings.embedding_model,
                openai_api_key=key,
                openai_api_base=self.settings.llm_base_url,
                request_timeout=25,
                max_retries=1,
            )
            store = InMemoryVectorStore(embeddings)
            digest = hashlib.sha256(
                (
                    self.settings.embedding_model
                    + str(self.settings.llm_base_url)
                    + str([(chunk.page_content, chunk.metadata) for chunk in self.chunks])
                ).encode()
            ).hexdigest()
            cache = self.settings.vector_cache_path.with_name(f"vectors-{digest}.json")
            if cache.exists():
                store = InMemoryVectorStore.load(str(cache), embeddings)
            else:
                await store.aadd_documents(self.chunks)
                cache.parent.mkdir(parents=True, exist_ok=True)
                store.dump(str(cache))
            self.store = store
            return store

    async def search(self, query: str, vehicle_id: str | None = None) -> list[Source]:
        candidates = [
            chunk
            for chunk in self.chunks
            if (not vehicle_id or chunk.metadata["vehicle_id"] in (None, vehicle_id))
        ]
        words = set(re.findall(r"[a-z0-9]+", query.lower()))
        scored = sorted(
            candidates,
            key=lambda doc: len(words & set(re.findall(r"[a-z0-9]+", doc.page_content.lower()))),
            reverse=True,
        )
        lexical = [
            doc for doc in scored if words & set(re.findall(r"[a-z0-9]+", doc.page_content.lower()))
        ]
        if self.settings.agent_mode == "live":
            if self.settings.database_url and self.settings.database_url.startswith("postgresql"):
                from autonex.infrastructure.vector import PostgresVectorIndex

                index = PostgresVectorIndex(self.settings)
                semantic = await index.search(query, candidates)
            else:
                store = await self._vector_store()
                allowed = {chunk.metadata["id"] for chunk in candidates}
                semantic_scores = await store.asimilarity_search_with_score(
                    query, k=8, filter=lambda doc: doc.metadata["id"] in allowed
                )
                semantic = [doc for doc, score in semantic_scores if score >= 0.35]
            # Reciprocal rank fusion keeps exact lexical matches and semantic matches.
            scores: dict[str, float] = {}
            by_id = {doc.metadata["id"]: doc for doc in candidates}
            for ranking in (lexical[:8], semantic):
                for rank, doc in enumerate(ranking):
                    key = doc.metadata["id"]
                    scores[key] = scores.get(key, 0) + 1 / (60 + rank + 1)
            found = [
                by_id[key] for key in sorted(scores, key=lambda key: scores[key], reverse=True)[:4]
            ]
        else:
            found = lexical[:4]
        return [
            Source(
                id=doc.metadata["id"],
                document_id=doc.metadata["document_id"],
                title=doc.metadata["title"],
                excerpt=doc.page_content,
                version=doc.metadata["version"],
                url=doc.metadata["url"],
            )
            for doc in found
        ]
