# AUTONEX AI project guidance

See [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md),
[RAG.md](./RAG.md), [MCP.md](./MCP.md), [EVALUATION.md](./EVALUATION.md),
and [DEPLOYMENT.md](./DEPLOYMENT.md) for the current Vite/FastAPI architecture.

## Ground rules for this repo

- **Never bypass the repository boundary.** UI/feature code must depend on
  `VehicleRepository` / `AgentRepository` interfaces (or the Zustand stores
  that wrap them) — never import the backend catalog JSON directly from a component. This is what keeps the mock-to-real-backend swap a one-file
  change.
- **TypeScript strict, no `any`** without a comment explaining why.
- **3D scene stays dumb.** `VehicleScene.tsx` only renders —
  no business logic, no repository calls. Configuration state flows in via
  props from `Showroom.tsx`, which reads the Zustand store.
- Before committing: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
  must all pass. Husky's pre-commit hook runs lint-staged automatically.

## AUTONEX implementation rules

- Use Times New Roman, burgundy theme tokens and uppercase interface labels. Preserve user input, document content, API values and technical identifiers.
- BMW is a demonstration domain. AUTONEX XUV is a fictional G-Wagon-inspired concept and the catalog default (`is_default`). Never claim an official manufacturer relationship, licensed model, live manufacturer data or partner authorization.
- Catalog specifications, trims, options and estimates are fictional fixtures. Keep public BMW reference notes separate, dated and cited.
- FastAPI owns estimates and validates option IDs. The frontend uses repositories and stores; no component imports backend catalog data.
- Master delegates to question understanding, RAG, vehicle intelligence, MCP execution, validation and response synthesis. Report generation is an on-demand adapter over a validated persisted run.
- Retry providers at most once. Keep total deadlines, concurrency bounds, sanitized errors and audit facts intact. Never invent counters, token usage or tool events.
- Current MCP tools are safe simulations. Real bookings, purchases or customer account changes require verified authorization and explicit approval.
- Run `pnpm test:backend` and `pnpm check:backend` with frontend gates for backend changes. Run the desktop/mobile Playwright flow for UI behavior changes.
