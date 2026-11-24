Phase 0 has been reviewed and approved.

Now implement Phase 1 from northstar_implementation_plan.md.

Before making changes:
1. Re-read the Phase Isolation rules.
2. Run all Phase 0 tests.
3. Confirm Phase 0 is healthy.
4. Treat phases/00-rest as frozen.

IMPLEMENT PHASE 1 ONLY.

Implement the conversational Agentic solution.

Default mode:
TOOL_BACKEND=direct

It must run without the Phase 0 REST server.

Optional comparison mode:
TOOL_BACKEND=rest

REST-backed mode must reuse the Phase 0 REST APIs through the shared
typed REST client. Do not import Phase 0 implementation source.

The model-visible tool names, descriptions, inputs and outputs must be
identical in both modes.

Implement:
- conversational CLI;
- in-memory session state;
- system instructions and decisioning guardrails;
- granular tools;
- explicit model/tool execution loop;
- provider-neutral model adapter;
- mock model adapter for deterministic tests;
- schema validation;
- direct capability backend;
- REST capability backend;
- backend factory;
- structured agent logging;
- automated tests;
- direct-versus-REST parity tests;
- standard evaluation scenarios.

Do NOT implement MCP.
Do NOT implement A2A.

Run the Phase 1 exit gate and rerun Phase 0 regression tests.

Complete:
- phases/01-agentic/README.md
- docs/observations/phase-01-agentic.md

Then STOP. Do not proceed to Phase 2.

Report exact commands for:
1. Agentic direct mode;
2. Agentic REST-backed mode;
3. tests;
4. viewing logs.