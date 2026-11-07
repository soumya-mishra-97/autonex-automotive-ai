"""Initial catalog, runs, leads, operations and versioned vector index."""

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Column, String

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name in ("vehicles", "runs", "test_drives", "operations"):
        op.create_table(
            name, Column("id", String, primary_key=True), Column("payload", JSON, nullable=False)
        )
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.create_table(
            "knowledge_chunks",
            Column("id", String, primary_key=True),
            Column("content", String, nullable=False),
            Column("metadata", JSON, nullable=False),
            Column("embedding", Vector(1536), nullable=False),
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.drop_table("knowledge_chunks")
    for name in ("operations", "test_drives", "runs", "vehicles"):
        op.drop_table(name)
