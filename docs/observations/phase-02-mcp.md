# Phase 2 observations — MCP

## 1. What did MCP standardise?

- A **protocol boundary** for tool discovery (`listTools`), invocation (`callTool`), and resources (`listResources` / `readResource`).
- Stable tool names/schemas that the host learns at runtime instead of compiling a local registry into the agent.
- A clear split: **host/model orchestration** vs **capability server**.

## 2. What additional runtime/process complexity appeared?

- A second process (stdio server) with its own lifecycle and env.
- Dual logs (host + server) that must share `runId` / `mcpRequestId`.
- stdout belongs to JSON-RPC — structured logs must go to files; human noise to stderr.
- REST-backed mode adds a third hop (host → MCP → REST → Phase 0) and an explicit availability check.

## 3. What became discoverable rather than compiled into the app?

- The host’s model tool list comes from MCP discovery, not from importing Phase 1’s registry.
- Knowledge articles are listed/read as `knowledge://articles/...` resources.
- Server instructions advertise resource URIs to clients.

## 4. How did debugging change across client/server boundaries?

- Failures can sit on either side: model tool choice, MCP transport, server validation, or capability backend.
- Correlation IDs (`mcpRequestId`) are required to stitch one user turn across two JSONL files.
- Invalid args often fail inside the SDK/server before domain code runs — traces show that clearly.

## 5. For this small app, where is MCP beneficial vs simpler?

**Beneficial when** you want a reusable capability surface, multiple hosts, or a hard boundary before A2A specialists.

**Simpler without MCP (Phase 1)** for a single local agent: fewer processes, one log file, faster iteration.

## 6. Good MCP tools vs resources (Northstar)

| Prefer as MCP **tool** | Prefer as MCP **resource** |
|---|---|
| Parameterised lookups (`getFaults`, `getPayments`, …) | Stable knowledge articles (full text) |
| Search (`searchKnowledge`) | Article index (`knowledge://articles`) |
| Draft side-effect (`draftSupportCase`) | — |

Query-shaped access stays a tool; document-shaped content fits resources.
