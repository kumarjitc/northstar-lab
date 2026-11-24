# Phase 3 observations — A2A

## 1. Which work genuinely benefited from independent ownership?

Cross-domain CUST-1010-style questions: service, billing, and contract evidence have different decision constraints. Separate agents make those ownership boundaries explicit and prevent one prompt from silently mixing domains.

## 2. Which calls should have remained tools rather than agents?

Simple single-domain lookups (e.g. “list faults for CUST-1001”) are cheaper as Phase 1/2 tools. Promoting every lookup to an agent adds process + A2A + MCP hops without better answers.

## 3. What complexity did discovery/task lifecycle introduce?

Agent Card fetch, port management, process startup ordering, timeouts, and dual protocol logs (A2A + MCP). Failures can sit on orchestrator, A2A transport, specialist model, or MCP.

## 4. What context had to cross agent boundaries?

Minimal JSON: `customerId`, focused `question`, optional `knownFacts`, plus correlation IDs. Full chat transcripts were intentionally not forwarded.

## 5. Latency and failure modes as hops increased

Each specialist turn is: orchestrator model → A2A → specialist model → MCP tool(s) → specialist model → A2A → orchestrator model. Latency stacks. Partial success is common (one specialist down, others ok) and must be synthesised honestly.

## 6. When would REST be better?

Stable, deterministic integrations with no need for conversational specialists or MCP discovery — Phase 0 style coded orchestration.

## 7. When would direct agent tools be sufficient?

Single-process support bots with one ownership domain (Phase 1).

## 8. When does MCP provide practical value?

Shared capability surface reused by multiple specialist hosts without embedding domain-services in each agent.

## 9. When does A2A justify its operational cost?

Multiple responsibility-owning agents, independent deploy/scale, or organisational boundaries between domains — not for every tool call.

## 10. REST-backed MCP reuse?

`mcp-rest` preserves A2A+MCP while swapping the capability transport. It reduces domain duplication vs re-implementing HTTP in each agent, at the cost of Phase 0 coupling and extra latency.

## Cross-phase comparison (final)

| Phase | Orchestration | Data access | Best for |
|---|---|---|---|
| 0 REST | Application code | HTTP APIs | Deterministic scenarios |
| 1 Agentic | Model + local tools | Direct/REST capabilities | Single agent, dynamic tools |
| 2 MCP | Model + discovered tools | MCP → capabilities | Portable tool/server boundary |
| 3 A2A | Orchestrator + specialists | Specialists → MCP | Multi-domain ownership + delegation |
