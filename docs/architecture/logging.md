# Northstar logging convention (all phases)

Every phase uses the same `@northstar/logger` style. Do not invent a separate logging approach for Agentic, MCP, or A2A.

## Rules

1. Write one new JSONL file per run under `phases/<phase>/logs/`.
2. Create the logger with `createPhaseLogger({ phase, component, ... })`.
3. Set `phase` to the canonical id: `00-rest` | `01-agentic` | `02-mcp` | `03-a2a`.
4. Log observable events only (inputs, tool/protocol calls, results, timings, errors). Never log secrets or private chain-of-thought.
5. Use the shared event names in `PHASE_LOG_EVENTS` where they apply.
6. Keep correlation IDs when relevant: `runId`, `sessionId`, `turnId`, `requestId`, `modelCallId`, `toolCallId`, `mcpRequestId`, `a2aTaskId`.

## Phase event focus

| Phase | Extra events (in addition to run.*) |
|---|---|
| 00-rest | `http.request.*`, `scenario.*` |
| 01-agentic | `user.message.received`, `model.*`, `tool.*`, `agent.iteration.completed`, `assistant.response.sent` |
| 02-mcp | `mcp.client.*`, `mcp.server.*`, `mcp.tool.*`, `mcp.resource.read` |
| 03-a2a | `a2a.task.*`, `a2a.delegation.*`, `a2a.synthesis.completed` (+ MCP events inside specialists) |
| 04-mcp-mixed | `mixed.route.executed` (+ mcp / a2a / rest.client.* per domain behind the facade) |

Also log `capability.backend.selected` at startup when a phase supports direct/REST backends.

## Viewing traces

Raw JSONL stays event-level. The graph/viewer collapses pairs (model request/response, tool start/complete, HTTP start/complete) into **plain-language steps** with a short “why” explanation and a story summary at the top:

`You asked` → `Model chose tool(s)` → `Tool ran` / `MCP tool ran` → `Model drafted a reply` → `Agent answered`

Phase 2 also surfaces MCP boundary steps such as `MCP client connected`, `MCP discovered N tool(s)`, and `MCP server ran: …` (host/server files share `runId` / `mcpRequestId`).

Phase 3 adds humanized A2A steps (`Discovered A2A agent`, `A2A → billing delegated`, `A2A → billing agent answered`, `Orchestrator synthesized answer`) across orchestrator + specialist + MCP-server JSONL files. The viewer/graph **auto-merge** sibling files that share a `run_<id>` prefix (e.g. `run_x.jsonl`, `run_x.billing.jsonl`, `run_x.billing.mcp-server.jsonl`), correlated by `a2aTaskId` (and still `mcpRequestId` inside specialists). Pass `?merge=0` on `/api/trace/...` to disable merge.

```bash
# all phases — picker is in the HTML page
npm run log:viewer -- --open

# phase-filtered
npm run rest:trace
npm run agentic:trace
npm run mcp:trace
npm run a2a:trace

# terminal
npm run log:graph -- --pick
npm run log:view -- --phase 01-agentic --pick
```

## Implementation checklist for a new phase

- [ ] Depend on `@northstar/logger`
- [ ] Call `createPhaseLogger` at process start
- [ ] Write logs only under `phases/<phase>/logs`
- [ ] Emit the phase-specific events listed above
- [ ] Confirm the HTML viewer lists the new files under that phase filter
