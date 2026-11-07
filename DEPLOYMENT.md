# Deployment and operation

## Local demonstration

Use the frontend-only demo or optional two-process setup in README.md. The frontend selects browser demo mode if FastAPI is absent. Set `VITE_WORKSPACE_MODE=demo` to skip the 2.5-second backend probe entirely. Connected defaults use SQLite and deterministic backend agents. No credentials are required. The UI server binds to loopback. The API's CORS allowlist permits local port 3000. Keep it private because the demonstration API has no authentication.

## PostgreSQL and pgvector

Use a PostgreSQL server with the pgvector extension installed. Set a backend-only `DATABASE_URL`, such as `postgresql+psycopg://autonex:password@localhost:5432/autonex`, then run:

```bash
uv run --project backend alembic -c backend/alembic.ini upgrade head
pnpm dev:api
```

Alembic creates JSON payload tables for catalog, runs, demo requests and operation records, plus a 1536-dimensional vector table on PostgreSQL. The migration role must be allowed to enable `vector`; use a separate restricted application role in a production deployment. PostgreSQL catalog fixtures are seeded/upserted at startup. Setting DATABASE_URL chooses SQLAlchemy storage; omitting it selects the existing local SQLite adapter. Do not point the SQLAlchemy adapter at the legacy SQLite file, whose payload storage is a different adapter format.

## Docker Compose

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD before using a shared machine.
docker compose up --build
```

Open http://127.0.0.1:3000. Compose runs pgvector/PostgreSQL, the FastAPI API, and a Vite production build served by Nginx. Only Nginx is published on loopback. The API runs Alembic before starting. Database health gates API startup; API health gates the web service. Nginx proxies API requests and disables buffering for streaming workflow events. The database uses the named `postgres` volume. Stop services with `docker compose down`; the volume remains. Back up the database before schema changes.

## LLM strategy

`AGENT_MODE=demo` runs the same workflow with deterministic rules and lexical search. `AGENT_MODE=live` requires `OPENAI_API_KEY`. Configure `LLM_MODEL`, `EMBEDDING_MODEL`, and optionally `LLM_BASE_URL` for an authorized OpenAI-compatible endpoint. Provider keys are never frontend variables. Live mode changes language/retrieval behavior; MCP services remain mock connectors. Provider and embedding calls can incur cost. API startup rejects live mode without a key and does not silently substitute demo results on failure.

## Observability

`TRACING_ENABLED=true` installs an OpenTelemetry console span exporter for workflow traces. Standard logging records run IDs, node names, duration and retry count without emitting keys or provider exceptions. The operations store records request text, completion/failure, actual timing, retries, provider-reported token usage, and MCP calls. Provider token metadata that is unavailable cannot be inferred. Add an OTLP exporter and retention policy for a deployed observability backend.

## Production extension checklist

The current application is a demonstration foundation. A production rollout must provide authentication, authorization, tenant-scoped queries, partner contracts/scopes, TLS, secrets management, rate limiting, database backup/retention and durable distributed checkpointing. Add explicit approval interrupts before any real consequential partner action. Current checkpoints are process-local; final results and audit facts persist. Curated document changes require an API restart. A liveness response does not verify remote LLM availability.
