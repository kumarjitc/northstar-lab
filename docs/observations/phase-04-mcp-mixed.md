# Phase 4 observations — mixed MCP facade

## 1. What changed vs Phase 2 / 3

Phase 2: one MCP server, one backend mode for all tools.  
Phase 3: A2A to three specialists, each using MCP.  
Phase 4: **one MCP facade** with **per-domain transports** (MCP / A2A / REST).

## 2. When a facade helps

Useful when the agent should see one tool catalog, but domains are owned by different platforms (MCP servers, agent fleets, legacy REST). The model stays simple; ops complexity moves behind the facade.

## 3. Cost of mixing

Failures and latency modes differ by transport. Traces must label `transport` on every route (`mixed.route.executed`). Partial failure (e.g. service agent down) must not be papered over by inventing evidence from billing/contract.

## 4. Why service uses direct tools

Option (a): the Service A2A agent uses **direct CapabilitySet** tools. That isolates the lesson to “A2A as a domain hop” without stacking A2A→MCP again (Phase 3 already taught that).

## 5. Contract REST coupling

Contract tools require Phase 0. That is intentional: REST remains a first-class backend, not something to hide behind another MCP unless you choose to.

## 6. Cross-phase comparison (updated)

| Phase | Agent sees | Domain access | Lesson |
|---|---|---|---|
| 0 REST | HTTP routes | domain-services | Deterministic API |
| 1 Agentic | Local tools | direct / REST | Model chooses tools |
| 2 MCP | MCP tools | MCP → direct / REST | Portable tool protocol |
| 3 A2A | Delegate tools | Specialists → MCP | Ownership / delegation |
| 4 Mixed | MCP tools | MCP + A2A + REST | Heterogeneous backends behind one facade |
