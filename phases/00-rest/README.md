# Phase 0 — Deterministic REST baseline

## Purpose

Demonstrate traditional application-owned orchestration over HTTP before introducing an LLM, MCP, or A2A. The scenario runners decide exactly which APIs to call and how to branch.

## Architecture

```text
Scenario Client / curl
        |
        v
Fastify REST API (phases/00-rest)
        |
        v
@northstar/domain-services
        |
   +----+----+
   v         v
data-access  knowledge-search
   |         |
shared/data  shared/knowledge
```

There is no LLM, MCP, or A2A in this phase.

## Dependencies

- `@northstar/domain-model`
- `@northstar/data-access`
- `@northstar/knowledge-search`
- `@northstar/domain-services`
- `@northstar/logger`
- `@northstar/scenario-kit`
- `fastify`, `zod`, `tsx`, `vitest`

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `REST_PORT` | `3000` | HTTP listen port |
| `REST_HOST` | `127.0.0.1` | Bind host |
| `NORTHSTAR_DATA_DIR` | `<repo>/shared/data` | JSON fixtures |
| `NORTHSTAR_KNOWLEDGE_DIR` | `<repo>/shared/knowledge` | Markdown knowledge |
| `LOG_DIR` | `<repo>/phases/00-rest/logs` | JSONL output |

See `.env.example`.

## Install / build / run / test

From the repository root:

```bash
npm install
npm run build
npm run rest:test
npm run rest
```

Deterministic scenarios:

```bash
npm --workspace phases/00-rest run scenarios
```

View logs:

```bash
npm run build --workspace @northstar/logger

# browser viewer with in-page JSONL picker (all phases / this phase)
npm run log:viewer -- --open
npm run rest:trace

# terminal: choose a JSONL file, then ASCII graph / line view
npm run log:graph -- --pick
npm run log:view -- --pick

# pass a file directly / use the newest log
npm run log:graph -- phases/00-rest/logs/<run_*.jsonl>
npm run log:graph -- --latest
```

## Example requests

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/customers/CUST-1005
curl http://127.0.0.1:3000/customers/CUST-1005/services
curl http://127.0.0.1:3000/customers/CUST-1005/billing-account
curl http://127.0.0.1:3000/customers/CUST-1005/faults
curl "http://127.0.0.1:3000/customers/search?lastName=Patel"
curl "http://127.0.0.1:3000/knowledge/search?q=pending%20payment"
```

Example scenario prompt implemented as coded orchestration:

> CUST-1005 says they have paid, but broadband is not working. What is happening?

## Log location

`phases/00-rest/logs/*.jsonl`

Events include `run.started`, `http.request.started`, `http.request.completed`, `scenario.step`, `scenario.decision`, `scenario.completed`, `run.completed`.

## Limitations

- Read-only fixture access; `POST /support-case-drafts` creates an in-memory `DRAFT` only.
- No authentication.
- No LLM decisioning.
- Future-phase packages (`model-client`, `rest-client`, `capability-contracts`) are intentionally absent.

## Differences from previous phase

This is the first phase. It establishes the deterministic REST baseline.

## Capability backend modes

Phase 0 is the REST capability surface itself. Later phases may call it optionally; Phase 0 does not depend on them.

## Exit-gate checklist

- [x] `npm run rest` works alone
- [x] REST tests pass
- [x] CUST-1005 pending-payment / access-restriction result is correct
- [x] CUST-1008 does not invent bill total or contract end date
- [x] CUST-1010 does not treat replacement order as fee proof
- [x] JSONL traces reconstruct REST/scenario calls
- [x] Observation draft written under `docs/observations/`
