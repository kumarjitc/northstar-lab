# Shared Northstar assets

- `data/` — immutable fictional JSON fixtures
- `knowledge/` — decisioning Markdown articles
- `packages/` — shared TypeScript packages used by phases

## Logging

All phases must use `@northstar/logger` via `createPhaseLogger`.
See [docs/architecture/logging.md](../docs/architecture/logging.md).

```bash
npm run log:viewer -- --open
```

Application orchestration (REST routes, agent loops, MCP, A2A) must not live here.
