# Evaluation and testing

Run the validation commands in README.md from the repository root. Unit/integration tests are deterministic and require neither an LLM key nor external BMW access.

| Suite                     | Coverage                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                    | Catalog response contracts, quote races, model reset, recommendation application, overlapping request prevention, bounded history, capped report memory and provider error recovery |
| pytest                    | Pricing, invalid option IDs, catalog/knowledge resources, LangGraph routing, citation rejection, real MCP discovery/calls, persistence, provider failure, deadlines and consent     |
| Platform pytest           | Stream event order, recorded metrics, bounded retries, sanitized failed streams, PDF response, SQLAlchemy adapter recreation and bounded metrics results                            |
| Playwright desktop/mobile | Dashboard, assistant, trace, configuration, comparison, demo consent request, knowledge, metrics, PDF download, theme persistence, typography, overflow and API retry               |
| Build checks              | Strict TypeScript, ESLint, Ruff format/lint, mypy and Vite production output                                                                                                        |

## Acceptance scenarios

- Fresh API storage reports zero queries, not seeded statistics.
- A successful run records three MCP calls in the standard workflow, with actual timing and zero LLM tokens in demo mode.
- A transient provider failure retries once; a repeated failure terminates and releases capacity. Provider details are not returned to the client.
- An agent cannot select an unlisted vehicle or cite an unretrieved source ID.
- Retrieval excludes another vehicle's documents when scoped and returns no lexical evidence for an unmatched query.
- Local run results, demo interest records and operations survive a process restart.
- Invalid contact details, missing consent and historical request dates are rejected.
- Theme selection persists while user input/document casing remains intact.

## Evaluation limits

The deterministic demo exercises orchestration and interfaces, not LLM answer quality. Live provider and PostgreSQL/pgvector integration need credentials and a running PostgreSQL instance; SQLAlchemy adapter tests use SQLite to exercise the repository contract. Docker Compose must be validated on a Docker host. This environment may not expose a native browser host; Playwright artifacts capture the tested desktop/mobile UI independently when the browser runtime is installed.

Before enabling an authorized partner connector, add benchmark questions with expected source IDs, answer entailment review, false-claim and insufficient-evidence cases, latency/token budgets, authorization/approval tests, load tests and tenant isolation checks. Do not treat citation-ID membership alone as factual correctness.

## Verification in this implementation

- Frontend checks cover automatic browser fallback, explicit demo mode, local persistence, quote validation and service simulation. Desktop/mobile flows run both with FastAPI and with every API request blocked, including PDF header validation. Backend tests remain separately runnable.
- TypeScript, ESLint, Ruff, mypy and production Vite build passed.
- Light/dark and mobile screenshots were reviewed. Both pages of a sample PDF were rendered and visually reviewed.
- The initial Alembic migration and catalog seeding were exercised with SQLAlchemy SQLite.
- Docker is not installed in this environment. Compose/PostgreSQL/pgvector execution and live-provider requests were not exercised. Local semantic retrieval was tested with deterministic embeddings.
