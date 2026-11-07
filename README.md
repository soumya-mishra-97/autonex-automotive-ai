# AUTONEX AI

**ENTERPRISE AUTOMOTIVE AI ORCHESTRATION**

Independent automotive customer experiences, vehicle intelligence, knowledge retrieval, service demonstrations, and observable agent workflows. BMW is the initial demonstration domain. This project has no official BMW affiliation, authorized partner integration, live inventory, or live BMW account access.

## Local setup

Requires Node 24+ and pnpm for the complete browser demonstration:

```bash
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. The dashboard automatically selects a local browser demo when FastAPI is unavailable; it no longer blocks the UI with a workspace connection screen. The showroom, configuration/estimates, rule-based assistant, sourced document search, local workflow events, operations, service simulation, demo request receipts and PDF downloads work without Python. `LOCAL DEMO ACTIVE` identifies this mode. No LLM, LangGraph backend or actual MCP transport runs in the browser.

To always skip backend checks, copy `.env.example` to `.env` and set `VITE_WORKSPACE_MODE=demo`, then restart Vite. The default `auto` setting checks the catalog, health and documents once with a 2.5-second deadline. If all three are valid it uses FastAPI; otherwise it selects one coherent browser adapter for the entire session. `CHECK CONNECTION` reloads the app and tries again. A failed backend write/provider request is never replayed automatically against the local adapter.

To enable the Python workflow, install Python 3.12+ and uv, then start the backend in a second terminal:

```bash
uv sync --project backend
pnpm dev:api
```

Reload the frontend. The API is at http://127.0.0.1:8000, with OpenAPI documentation at `/docs`. Default server demo mode needs no API key or external provider calls. SQLite stores backend run results, demo requests and metrics under `backend/var/`. Browser demo reports/metrics are stored separately on this device with a 50-record cap; demo receipt metadata excludes contact details. Unavailable browser storage falls back to session memory. Vite reads frontend `VITE_` settings from the repository `.env` and proxies `/api` to FastAPI.

## Working features

- Unified responsive showroom, assistant, model comparison, knowledge hub, operations, workflow, reports and settings.
- Procedural Three.js / React Three Fiber / Drei concept vehicle: drag, rotate, zoom, paint selection, and transparent interior preview. This is not a licensed BMW model or an accurate interior replica. A static illustration appears when WebGL is unavailable.
- Repository-backed catalog, validated configuration, server-calculated illustrative quotes, and consent-based local demo test-drive requests.
- Typed LangGraph master workflow with question understanding, RAG, vehicle intelligence, MCP execution, validation, and source-attributed response. Completed nodes stream over NDJSON.
- Deterministic offline strategy, or configured LangChain model calls in live mode. Local MCP tools remain demonstrations in both modes.
- Section-aware, content-versioned documents. Offline lexical retrieval; live hybrid lexical/semantic retrieval with reciprocal-rank fusion. PostgreSQL deployments persist embeddings in pgvector; local live mode caches embeddings in a local index.
- Recorded counts, failures, bounded retries, latency, actual provider token metadata and MCP calls. Empty workspaces show zero activity. Recharts visualizes recorded runs.
- Downloadable PDF execution reports with configuration, timing, sources and disclosures.
- Optional SQLAlchemy PostgreSQL persistence, Alembic migrations, Nginx and Docker Compose. OpenTelemetry spans are opt-in.

## Data boundaries

The catalog includes BMW i4, BMW iX, and the fictional AUTONEX XUV. The XUV is a G-Wagon-inspired electric adventure concept and is selected by default on the dashboard. It is not a Mercedes-Benz vehicle or licensed manufacturer model. **All configurable trims, numeric catalog specifications, equipment, pricing and packages are fictional fixtures, not manufacturer specifications or real offers.** Public BMW reference notes are separately labeled in the knowledge hub with publication date, region and source links. Reference notes do not establish current availability. The catalog uses `bmw-i4-demo`, `bmw-ix-demo` and `autonex-xuv-demo` identifiers and the backend uses the `autonex` Python namespace.

Service centers are virtual fixtures. Service requests are simulations. Demo test-drive requests save a local interest record; they do not create a reservation or send messages. No tool can perform purchases, real bookings or account changes.

## Stack and code map

| Layer                | Implementation                                                           |
| -------------------- | ------------------------------------------------------------------------ |
| Presentation         | React 19, strict TypeScript, Vite, Tailwind 4, Times New Roman, Recharts |
| Vehicle visuals      | Three.js, React Three Fiber, Drei, render-only scene                     |
| Frontend application | Zustand use cases and repository ports                                   |
| API / domain         | FastAPI, Pydantic, Python                                                |
| Agents               | LangGraph, LangChain, configurable OpenAI-compatible endpoint            |
| Retrieval            | Section-aware Markdown chunks, embeddings, hybrid ranking, pgvector      |
| Persistence          | Local SQLite adapter; SQLAlchemy PostgreSQL adapter; Alembic             |
| Delivery             | Docker Compose and Nginx                                                 |
| Checks               | Vitest, Playwright, pytest, Ruff, mypy                                   |

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:backend
pnpm check:backend
pnpm exec playwright install chromium  # Once, if browsers are absent
pnpm test:e2e
```

See [EVALUATION.md](EVALUATION.md) for test scope and current verification limits. This implementation is a runnable demonstration foundation, not an authenticated production customer platform. LangGraph checkpoints are process-local and released at completion; final runs and audit metrics persist. A production rollout needs identity, tenant isolation, partner authorization, retention policies and durable workflow checkpointing.

## Documentation

- [README_UI.md](README_UI.md): navigation, theme, accessibility and UI behavior
- [ARCHITECTURE.md](ARCHITECTURE.md): layers, diagrams and API surface
- [AGENTS.md](AGENTS.md): contributor rules and workflow responsibilities
- [RAG.md](RAG.md): ingestion, embeddings, citations and evidence limits
- [MCP.md](MCP.md): tools, transport and authorization boundaries
- [EVALUATION.md](EVALUATION.md): checks and scenario coverage
- [DEPLOYMENT.md](DEPLOYMENT.md): local, PostgreSQL and Compose operation

## Resource usage

The browser retains the latest 50 execution reports and 8 conversation messages. Older completed runs remain in backend storage. Charts load only when there is recorded data to plot. Operations polling stops while the tab is hidden and cancels in-flight requests when its panel unmounts. The 3D scene renders on demand, skips unchanged props and releases custom geometry on replacement/unmount.

Operations totals are aggregated in SQL; only the latest 50 records are loaded into API memory. Generated builds, browser-test artifacts and Python caches are disposable and ignored by Git. Keep `backend/var/` when cleaning so saved runs and demo requests survive.
