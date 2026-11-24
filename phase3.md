Phase 2 has been reviewed and approved.

Now implement Phase 3 A2A from northstar_implementation_plan.md.

Before making changes:
1. Run all Phase 0 tests.
2. Run all Phase 1 tests.
3. Run all Phase 2 tests.
4. Confirm all earlier phases remain independently runnable.
5. Treat phases/00-rest, phases/01-agentic and phases/02-mcp as frozen.

IMPLEMENT PHASE 3 ONLY.

Create independent:
- Support Orchestrator Agent;
- Billing Agent;
- Service Agent;
- Contract Agent.

Use the official A2A JavaScript SDK for genuine agent-to-agent
communication between independent processes/services.

Default capability mode:
A2A_CAPABILITY_BACKEND=mcp-direct

Architecture:
Support Orchestrator -> A2A -> Specialist Agent -> MCP
-> shared domain capability

Optional comparison mode:
A2A_CAPABILITY_BACKEND=mcp-rest

Architecture:
Support Orchestrator -> A2A -> Specialist Agent -> MCP -> REST
-> shared domain capability

Do not create a REST mode that bypasses MCP, because that changes more
than one architectural variable.

Implement:
- Agent Cards/capability discovery;
- A2A delegation and task lifecycle;
- Billing Agent;
- Service Agent;
- Contract Agent;
- single- and multi-specialist delegation;
- partial failure and timeout handling;
- correlation IDs across A2A, MCP and tools;
- separate multi-process JSONL logs;
- merged trace viewer;
- automated tests;
- standard scenarios.

Run the mandatory CUST-1010 cross-domain scenario.
Run all earlier-phase regression tests.

Complete:
- phases/03-a2a/README.md
- docs/observations/phase-03-a2a.md

Then STOP and provide the final cross-phase comparison.