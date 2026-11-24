# Phase 3 — A2A parent + specialist agents

Independent agent processes communicate with the official `@a2a-js/sdk`. Specialists use **MCP** for Northstar data (never import fixtures directly).

## Topology

```text
User
  └─ Support Orchestrator (parent)
       ├─ A2A → Billing Agent  → MCP → CapabilitySet
       ├─ A2A → Service Agent  → MCP → CapabilitySet
       └─ A2A → Contract Agent → MCP → CapabilitySet
```

| Agent | Role |
|---|---|
| Support Orchestrator | User chat, discovery, delegation tools, synthesis |
| Billing Agent | Bills, payments, disputes |
| Service Agent | Services, faults, orders |
| Contract Agent | Contracts, offers, interpretation |

## Modes

| Mode | Env | Needs Phase 0? |
|---|---|---|
| `mcp-direct` (default) | `A2A_CAPABILITY_BACKEND=mcp-direct` | No |
| `mcp-rest` | `A2A_CAPABILITY_BACKEND=mcp-rest` | Yes |

There is **no** bare-REST mode that bypasses MCP.

## Commands

```bash
# interactive (CLI spawns the three specialists)
A2A_CAPABILITY_BACKEND=mcp-direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run a2a

# REST-backed MCP inside specialists
npm run rest
A2A_CAPABILITY_BACKEND=mcp-rest MODEL_API_KEY=... npm run a2a

npm run a2a:test
npm run a2a:eval
npm run a2a:trace
```

Ports (defaults): billing `4101`, service `4102`, contract `4103`.

## Logging

Per-process JSONL under `phases/03-a2a/logs/`, sharing the parent `runId` via `A2A_PARENT_RUN_ID`:

- `run_<id>.jsonl` — orchestrator
- `run_<id>.billing|service|contract.jsonl` — specialists
- `run_<id>.<specialist>.mcp-server.jsonl` — MCP servers inside specialists
- Events: `a2a.agent.discovered`, `a2a.delegation.*`, `a2a.task.*`, `a2a.synthesis.completed`, plus MCP events in specialists
- Correlate: `runId → sessionId → turnId → a2aTaskId → mcpRequestId`
- Viewer: `npm run a2a:trace` merges siblings into one plain-language timeline

## Exit gate

- [x] Phases 0–2 independently runnable / frozen
- [x] Genuine A2A between processes (Agent Cards + `sendMessage`)
- [x] Specialists use MCP for capabilities
- [x] CUST-1010 multi-specialist scenario covered in tests
- [x] Partial failure / unavailable specialist handled

## Observations

See [docs/observations/phase-03-a2a.md](../../docs/observations/phase-03-a2a.md).
