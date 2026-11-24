# Northstar Agent Lab

Independently runnable Node.js/TypeScript reference implementations over the same fictional Northstar Broadband dataset.

| Phase | Pattern | Orchestration owner |
|---|---|---|
| 0 REST | Deterministic HTTP APIs | Application code |
| 1 Agentic | Conversational agent + local tools | Model tool selection |
| 2 MCP | Agent + MCP client/server boundary | Model + MCP discovery |
| 3 A2A | Orchestrator + specialist agents | A2A delegation; MCP for data |
| 4 Mixed | MCP facade + heterogeneous backends | MCP host; billing MCP / service A2A / contract REST |

## Current status

**Phases 0–4 are implemented.**

```bash
TOOL_BACKEND=direct npm run agentic          # Phase 1; no REST server
TOOL_BACKEND=rest npm run agentic            # Phase 1 via Phase 0 HTTP
MCP_TOOL_BACKEND=direct npm run mcp          # Phase 2; spawns MCP server over stdio
MCP_TOOL_BACKEND=rest npm run mcp            # Phase 2 tools via Phase 0 HTTP
A2A_CAPABILITY_BACKEND=mcp-direct npm run a2a  # Phase 3 orchestrator + specialists
npm run rest && npm run mixed                # Phase 4 mixed MCP facade (needs Phase 0 for contract)
```

## Quick start

```bash
npm install
npm run build
npm run rest:test
npm run agentic:test
npm run mcp:test
npm run a2a:test
npm run mixed:test
npm run rest
TOOL_BACKEND=direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run agentic
MCP_TOOL_BACKEND=direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run mcp
A2A_CAPABILITY_BACKEND=mcp-direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run a2a
MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run mixed
```

Deterministic Phase 0 scenarios:

```bash
npm --workspace phases/00-rest run scenarios
```

Linear trace viewer (same logger style for every phase; picker is in the HTML page):

```bash
npm run log:viewer -- --open
npm run rest:trace
npm run agentic:trace
npm run mcp:trace
npm run a2a:trace
npm run mixed:trace
```

See [docs/architecture/logging.md](docs/architecture/logging.md).

## Dataset

Fictional fixtures live in `shared/data` and `shared/knowledge`.
Baseline zip: `northstar_fictional_decisioning_dataset_v3.zip`.

## Commands

See **[COMMANDS.md](COMMANDS.md)** for the living cheat sheet (run, test, logs, viewer).

## Planning docs

- `northstar_implementation_plan.md` — authoritative technical specification
- `vibe_agent_phase_execution_guide.md` — phase prompts and stop gates
- `northstar_phasewise_customer_utterances.md` — shared evaluation language
- `data-generation-guide.md` — dataset generation rules
- `phase0.md` … `phase3.md` — authorisation prompt copies

## Comparison reminder

```text
REST   -> code owns orchestration
Agentic -> model owns dynamic tool selection
MCP    -> standard protocol boundary for tools/resources
A2A    -> standard boundary for inter-agent collaboration/delegation
```
