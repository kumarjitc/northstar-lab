# Phase 4 — Mixed MCP facade

The **host agent speaks MCP only**. Behind one facade server, each domain uses a different transport:

```text
User → Host (model)
         │  MCP listTools / callTool
         ▼
   Mixed MCP facade
         ├─ billing_*     → MCP child (Phase 2 server) → CapabilitySet
         ├─ ask_service_agent → A2A → Service agent → direct CapabilitySet
         └─ contract_*    → REST → Phase 0
```

## Why this phase

Phases 0–3 each used one primary style. Phase 4 shows a realistic enterprise pattern: **one agent-facing protocol (MCP)** with **heterogeneous backends** (MCP + A2A + REST).

Service agent uses **direct tools** (option a) so the novelty stays on the facade, not another A2A→MCP stack.

## Run

```bash
# Contract path needs Phase 0
npm run rest

# Interactive host (spawns service agent + facade + billing MCP child)
MIXED_BILLING_MCP_BACKEND=direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run mixed

npm run mixed:test
npm run mixed:trace
```

Default service agent port: `4202` (`MIXED_SERVICE_PORT`).

## Logging

Under `phases/04-mcp-mixed/logs/`:

- `run_<id>.jsonl` — host
- `run_<id>.facade.jsonl` — facade
- `run_<id>.service.jsonl` — service A2A agent
- `run_<id>.billing.mcp-server.jsonl` — billing MCP child

Look for `mixed.route.executed` with `transport: mcp | a2a | rest`.

## Exit gate

- [x] Host never calls REST/A2A directly — only the MCP facade
- [x] Billing path is genuine MCP (Phase 2 server child)
- [x] Service path is genuine A2A (Agent Card + `sendMessage`) with **direct** tools
- [x] Contract path is genuine REST to Phase 0
- [x] Tests exercise all three transports

## Observations

See [docs/observations/phase-04-mcp-mixed.md](../../docs/observations/phase-04-mcp-mixed.md).
