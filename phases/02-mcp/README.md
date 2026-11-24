# Phase 2 — MCP tool/resource boundary

Keep a single conversational agent, but move capability access across a **genuine MCP client/server boundary** (official TypeScript SDK, stdio transport).

## Architecture

```text
CLI (MCP host)
  └─ Agent loop (model + discovered MCP tools)
       └─ MCP Client  ──stdio──▶  MCP Server
                                    ├─ Tools  → CapabilitySet
                                    │              ├─ MCP_TOOL_BACKEND=direct → domain-services
                                    │              └─ MCP_TOOL_BACKEND=rest   → rest-client → Phase 0
                                    └─ Resources → knowledge://articles/...
```

No A2A. Phase 1’s in-process tool registry is not imported (phase isolation).

## Modes

| Mode | Env | Needs Phase 0 running? |
|---|---|---|
| `direct` (default) | `MCP_TOOL_BACKEND=direct` | No |
| `rest` | `MCP_TOOL_BACKEND=rest` + `NORTHSTAR_REST_BASE_URL` | Yes |

Tool **names and schemas are identical** across backends. REST mode fails loudly if Phase 0 is down — never silent fallback.

## Commands

```bash
# interactive host (spawns MCP server over stdio)
MCP_TOOL_BACKEND=direct npm run mcp

# REST-backed MCP tools (start Phase 0 first)
npm run rest
MCP_TOOL_BACKEND=rest npm run mcp

# tests
npm run mcp:test

# optional live eval (real model)
npm run mcp:eval

# trace viewer
npm run mcp:trace
```

Copy `.env.example` → `.env` (or reuse repo-root / Phase 1 env for `MODEL_*`).

## CLI extras

| Command | Meaning |
|---|---|
| `/tools` | List tools discovered via MCP `listTools` |
| `/resources` | List MCP knowledge resources |
| `/log` | Host + server JSONL paths |

## Logging

- Host: `phases/02-mcp/logs/<runId>.jsonl` (`component=mcp-host`)
- Server: `phases/02-mcp/logs/<runId>.server.jsonl` (`component=mcp-server`)
- Correlate with shared `runId` and per-call `mcpRequestId`
- Events: `mcp.client.connected`, `mcp.tools.listed`, `mcp.tool.*`, `mcp.resource.read`, `mcp.server.*`

## Exit gate checklist

- [x] Phase 0 and 1 still run independently
- [x] `npm run mcp` default direct mode does not require Phase 0/1 processes
- [x] Optional REST mode uses `@northstar/rest-client` (no Phase 0 source import in runtime path)
- [x] Tool discovery via real MCP `listTools` (stdio + in-memory tests)
- [x] Host/server traces correlatable via `mcpRequestId`
- [x] S03/S06/S09 scripted paths + direct/REST parity tests
- [x] Knowledge articles exposed as MCP resources

## Observations

See [docs/observations/phase-02-mcp.md](../../docs/observations/phase-02-mcp.md).
