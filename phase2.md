Phase 1 has been reviewed and approved.

Now implement Phase 2 MCP from northstar_implementation_plan.md.

Before modifying anything:
1. Run Phase 0 tests.
2. Run Phase 1 tests.
3. Confirm both phases remain healthy.
4. Treat phases/00-rest and phases/01-agentic as frozen.
5. Re-read the MCP and Phase Isolation sections.

IMPLEMENT PHASE 2 ONLY.

Use the official MCP TypeScript SDK.

Default mode:
MCP_TOOL_BACKEND=direct

Architecture:
Agent -> MCP Client -> MCP Server -> MCP Tool -> shared capability

Optional comparison mode:
MCP_TOOL_BACKEND=rest

Architecture:
Agent -> MCP Client -> MCP Server -> MCP Tool -> typed REST client
-> Phase 0 REST API -> shared capability

Requirements:
- tool discovery must use MCP genuinely;
- do not simulate MCP with internal function calls;
- tool names and schemas must be stable across backend modes;
- expose appropriate knowledge through MCP resources;
- client/server boundaries must be visible in logs;
- preserve correlation IDs;
- add direct-versus-REST parity tests;
- explicitly fail if the selected backend is unavailable;
- never silently switch backend.

Do NOT implement A2A.

Run the Phase 2 exit gate and regression-test Phases 0 and 1.

Complete:
- phases/02-mcp/README.md
- docs/observations/phase-02-mcp.md

Then STOP.

Report exact commands for:
1. MCP direct mode;
2. MCP REST-backed mode;
3. tests;
4. viewing and correlating MCP client/server logs.