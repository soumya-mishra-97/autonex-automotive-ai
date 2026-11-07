# Retrieval and evidence

The knowledge adapter loads curated UTF-8 Markdown documents from `backend/knowledge` at API startup. Only bundled, explicitly selected documents are loaded; arbitrary URLs, user-supplied paths and document instructions do not execute tools.

## Pipeline

1. Read the document and compute a SHA-256 content version.
2. Split at document/section headings, then use a 700-character recursive splitter with 100-character overlap within a section. Chunks carry document ID, heading/title, vehicle scope, version and public source URL.
3. In demo mode, rank exact lexical token overlap. A request without any match yields no sources and an explicit insufficient-evidence warning.
4. In live mode, generate embeddings with the configured LangChain embedding model. Local storage caches an index keyed by model and chunk metadata. PostgreSQL uses a persisted pgvector index with versioned chunk IDs namespaced by embedding model/provider. The initial migration requires 1536 dimensions.
5. Semantic candidates require at least 0.35 cosine similarity (pgvector distance at most 0.65). This is a retrieval filter, not an entailment guarantee. Scope candidates to the selected vehicle and shared ownership guidance. Combine the top lexical and semantic rankings with reciprocal-rank fusion (`1 / (60 + rank + 1)`). Return at most four chunks.
6. Pass retrieved evidence as data to the response strategy. Validate that cited IDs belong to retrieved chunks. Expose source excerpts, versions and URLs in the UI and PDF. Manufacturer links attach only to public reference sections; fictional fixture sections have no manufacturer source URL.

The public BMW notes identify the announcement date, US region and limitations. Configurable catalog figures are separate fictional AUTONEX fixtures. Do not interpret a demo trim or estimated quote as BMW factory data. Older embedding versions remain in PostgreSQL for auditability, but retrieval filters to current loaded chunk IDs. Retention/cleanup of superseded versions is an operational policy to add before production.

## Evidence limits

ID validation prevents invented citation identifiers; it does not prove that every sentence is entailed by a cited excerpt. The demo recommendation is deterministic configuration advice and labels itself accordingly. Semantic search can return weak matches; users must inspect excerpts and verify consequential details with an authorized source. No corpus claim establishes inventory, current pricing, appointment availability or a partnership.

Live mode does not fall back silently to demo mode on provider failure. Embedding errors terminate the run with a sanitized message. Both local and PostgreSQL embedding providers require authorized credentials. Use `LLM_BASE_URL` for an OpenAI-compatible authorized provider, and configure model names explicitly.

## Update documents

Edit curated Markdown and restart the API. Content changes generate new version IDs automatically. The local embedding cache key changes; PostgreSQL lazily embeds missing current chunks. Keep manufacturer facts source-attributed, dated and region-specific. Additional brands can supply new documents/catalog IDs and extend the vehicle-to-document metadata mapping without changing graph nodes.
