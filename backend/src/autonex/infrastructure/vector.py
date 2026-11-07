"""Versioned pgvector index used by the live hybrid retrieval strategy."""

import asyncio
import hashlib

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Column, MetaData, String, Table, create_engine, select
from sqlalchemy.dialects.postgresql import insert

from autonex.infrastructure.settings import Settings


class PostgresVectorIndex:
    def __init__(self, settings: Settings) -> None:
        if settings.vector_dimensions != 1536:
            raise ValueError("The current migration requires 1536-dimensional embeddings.")
        self.namespace = hashlib.sha256(
            (settings.embedding_model + str(settings.llm_base_url)).encode()
        ).hexdigest()[:16]
        self.engine = create_engine(settings.database_url or "", pool_pre_ping=True)
        self.embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            openai_api_key=settings.openai_api_key,
            openai_api_base=settings.llm_base_url,
            request_timeout=25,
            max_retries=1,
            dimensions=1536,
        )
        self.table = Table(
            "knowledge_chunks",
            MetaData(),
            Column("id", String, primary_key=True),
            Column("content", String, nullable=False),
            Column("metadata", JSON, nullable=False),
            Column("embedding", Vector(1536), nullable=False),
        )

    async def search(self, query: str, candidates: list[Document]) -> list[Document]:
        if not candidates:
            return []
        try:
            ids = [self.namespace + ":" + doc.metadata["id"] for doc in candidates]
            with self.engine.connect() as connection:
                existing: set[str] = set(
                    connection.execute(
                        select(self.table.c.id).where(self.table.c.id.in_(ids))
                    ).scalars()
                )
            missing = [
                doc
                for doc in candidates
                if self.namespace + ":" + doc.metadata["id"] not in existing
            ]
            if missing:
                vectors = await self.embeddings.aembed_documents(
                    [doc.page_content for doc in missing]
                )

                def persist() -> None:
                    with self.engine.begin() as connection:
                        for doc, vector in zip(missing, vectors, strict=True):
                            connection.execute(
                                insert(self.table)
                                .values(
                                    id=self.namespace + ":" + doc.metadata["id"],
                                    content=doc.page_content,
                                    metadata=doc.metadata,
                                    embedding=vector,
                                )
                                .on_conflict_do_nothing()
                            )

                await asyncio.to_thread(persist)
            vector = await self.embeddings.aembed_query(query)

            def retrieve() -> list[Document]:
                with self.engine.connect() as connection:
                    rows = connection.execute(
                        select(self.table.c.content, self.table.c.metadata)
                        .where(self.table.c.id.in_(ids))
                        .where(self.table.c.embedding.cosine_distance(vector) <= 0.65)
                        .order_by(self.table.c.embedding.cosine_distance(vector))
                        .limit(8)
                    )
                    return [Document(page_content=row[0], metadata=row[1]) for row in rows]

            return await asyncio.to_thread(retrieve)
        finally:
            self.engine.dispose()
