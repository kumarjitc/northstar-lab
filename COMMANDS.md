# Northstar Agent Lab — important commands

Living cheat sheet. Update this file whenever a new phase or workflow command is added.

---

## Setup

```bash
npm install
npm run build
```

Config for Phase 1 lives in `phases/01-agentic/.env` (loaded automatically by the CLI).

---

## Phase 0 — REST

```bash
# start API (default http://127.0.0.1:3000)
npm run rest

# tests
npm run rest:test

# deterministic scenario runners
npm --workspace phases/00-rest run scenarios

# example requests
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/customers/CUST-1005
curl http://127.0.0.1:3000/customers/CUST-1005/faults
curl "http://127.0.0.1:3000/customers/search?lastName=Patel"
```

---

## Phase 1 — Agentic

Uses Mistral by default (`MODEL_PROVIDER=mistral` in `.env`).

```bash
# tests (mock model; includes direct↔REST parity)
npm run agentic:test

# conversational CLI — direct tools (no REST server needed)
npm run agentic

# conversational CLI — tools via Phase 0 REST
npm run rest                                          # terminal 1
TOOL_BACKEND=rest npm run agentic                     # terminal 2

# optional live scenario eval against the real model
npm run agentic:eval
```

CLI slash commands: `/help` `/new` `/state` `/log` `/quit`

Useful env overrides (usually set in `phases/01-agentic/.env`):

```bash
TOOL_BACKEND=direct|rest
MODEL_PROVIDER=mistral
MODEL_API_KEY=...
# or MISTRAL_API_KEY=...
MODEL_BASE_URL=https://api.mistral.ai/v1
MODEL_NAME=mistral-small-latest
NORTHSTAR_REST_BASE_URL=http://127.0.0.1:3000
```

---

## Logs and trace viewer

Same JSONL logger style for every phase. Viewer has an in-page file picker and shows plain-language steps (You asked → Model chose tool → Tool ran → Agent answered).

```bash
# all phases — opens browser
npm run log:viewer -- --open

# phase-filtered viewers
npm run rest:trace
npm run agentic:trace
npm run mcp:trace
npm run a2a:trace
npm run mixed:trace

# terminal: pick a JSONL file, then ASCII linear graph
npm run log:graph -- --pick

# terminal: pick a JSONL file, then line-by-line events
npm run log:view -- --pick

# latest Phase 0 log as ASCII graph
npm run log:graph -- --latest --phase 00-rest
```

Log folders:

- `phases/00-rest/logs/`
- `phases/01-agentic/logs/`
- `phases/02-mcp/logs/`
- `phases/03-a2a/logs/`
- `phases/04-mcp-mixed/logs/`

---

## Tests (summary)

```bash
npm run rest:test
npm run agentic:test
npm run mcp:test
npm run a2a:test
npm run mixed:test
npm run test              # all workspaces that define tests
```

---

## Phase 2 — MCP

```bash
# interactive host (spawns MCP server over stdio)
MCP_TOOL_BACKEND=direct npm run mcp

# REST-backed MCP tools (start Phase 0 first in another terminal)
npm run rest
MCP_TOOL_BACKEND=rest npm run mcp

# tests + optional live eval
npm run mcp:test
npm run mcp:eval

# traces (host + server JSONL under phases/02-mcp/logs/)
npm run mcp:trace
```

---

## Phase 3 — A2A

```bash
# interactive orchestrator (spawns billing/service/contract specialists)
A2A_CAPABILITY_BACKEND=mcp-direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run a2a

# specialists use MCP→REST (start Phase 0 first)
npm run rest
A2A_CAPABILITY_BACKEND=mcp-rest MODEL_API_KEY=... npm run a2a

npm run a2a:test
npm run a2a:eval
npm run a2a:trace          # HTML viewer; merges orch + specialist + mcp-server JSONL
```

Default ports: billing `4101`, service `4102`, contract `4103`.

---

## Phase 4 — Mixed MCP facade

```bash
# Contract REST needs Phase 0
npm run rest

# Host speaks MCP only; billing→MCP, service→A2A(direct), contract→REST
MIXED_BILLING_MCP_BACKEND=direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run mixed

npm run mixed:test
npm run mixed:eval
npm run mixed:trace
```

Default service agent port: `4202`.

---

## Docs worth keeping open

| File | Why |
|---|---|
| [COMMANDS.md](COMMANDS.md) | This cheat sheet |
| [README.md](README.md) | Project overview |
| [docs/architecture/logging.md](docs/architecture/logging.md) | Shared logging rules |
| [phases/00-rest/README.md](phases/00-rest/README.md) | Phase 0 details |
| [phases/01-agentic/README.md](phases/01-agentic/README.md) | Phase 1 details |
| [phases/04-mcp-mixed/README.md](phases/04-mcp-mixed/README.md) | Phase 4 mixed facade |
