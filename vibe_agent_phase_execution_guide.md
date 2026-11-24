Vibe Agent Phase-by-Phase Execution Guide

## 1. Purpose

Use this guide to execute the Northstar Agent Lab implementation one phase at a time in a coding or Vibe Agent. The implementation plan is the governing technical specification; this guide provides the prompts, review gates, commands and reflection questions used to control delivery.

Do not ask the Vibe Agent to implement the entire plan in one run. Complete, verify and reflect on each phase before authorising the next.

---

## 2. Files to provide to the Vibe Agent

Provide these files at the start of the project:

1. `northstar_implementation_plan.md`
2. `northstar_fictional_decisioning_dataset_v3.zip`
3. This guide: `vibe_agent_phase_execution_guide.md`

Tell the agent:

- `northstar_implementation_plan.md` is the authoritative implementation specification.
- The ZIP is the immutable fictional data and knowledge baseline.
- This guide controls phase execution and stopping points.
- If this guide and the implementation plan appear to conflict, stop and report the conflict before changing code.

---

## 3. Execution model

```text
Phase 0: REST
|
+-- Build
+-- Test
+-- Run scenarios
+-- Inspect logs
+-- Reflect
+-- STOP

Phase 1: Agentic
|
+-- Regression-test Phase 0
+-- Build
+-- Test direct and REST-backed modes
+-- Inspect logs
+-- Compare
+-- STOP

Phase 2: MCP
|
+-- Regression-test Phases 0 and 1
+-- Build
+-- Test direct and REST-backed MCP modes
+-- Inspect correlated logs
+-- Compare
+-- STOP

Phase 3: A2A
|
+-- Regression-test all earlier phases
+-- Build independent agents
+-- Test MCP-direct and MCP-REST modes
+-- Inspect end-to-end traces
+-- Final comparison
```

A pause is an engineering gate, not an administrative delay. Do not permit the Vibe Agent to pre-build the next phase during a pause.

---

# 4. Phase 0: REST

## 4.1 Prompt to give the Vibe Agent

```text
Read northstar_implementation_plan.md and
vibe_agent_phase_execution_guide.md completely before making changes.

Treat northstar_implementation_plan.md as the authoritative technical
specification.

Use northstar_fictional_decisioning_dataset_v3.zip as the immutable
fictional data and knowledge baseline.

IMPLEMENT PHASE 0 ONLY.

Tasks:
1. Create the repository and npm workspace structure defined in the plan.
2. Create only the shared packages required by Phase 0.
3. Implement Phase 0 REST completely.
4. Implement structured JSONL logging.
5. Implement the deterministic scenario runner.
6. Implement all Phase 0 tests.
7. Run build, typecheck and tests.
8. Execute the mandatory Phase 0 scenarios.
9. Verify that generated execution logs reconstruct the flow.
10. Complete phases/00-rest/README.md.
11. Complete docs/observations/phase-00-rest.md.

Do NOT implement Agentic, MCP or A2A.
Do NOT install MCP or A2A dependencies.
Empty future-phase directory placeholders are acceptable, but do not
scaffold future implementation code.

When Phase 0 passes its exit gate, STOP.
Do not proceed to Phase 1 automatically.

At the end report:
- files created;
- architecture implemented;
- build and typecheck results;
- test results;
- scenarios executed;
- log locations;
- exact commands to run Phase 0;
- known limitations;
- deviations from northstar_implementation_plan.md.

Wait for my explicit approval before implementing Phase 1.
```

## 4.2 Verification

Run the exact commands reported by the Vibe Agent. They should be equivalent to:

```bash
npm install
npm run build
npm run rest:test
npm run rest
```

Test representative endpoints:

```text
GET /health
GET /customers/CUST-1005
GET /customers/CUST-1005/services
GET /customers/CUST-1005/billing-account
GET /customers/CUST-1005/faults
```

Run the deterministic scenario for:

> CUST-1005 says they have paid, but broadband is not working. What is happening?

Expected facts:

- the earlier payment failed;
- the retry remains pending rather than settled;
- physical line diagnostics pass;
- access is blocked/restricted;
- the evidence does not support diagnosing a physical network fault;
- reconnection must not be promised.

Inspect `phases/00-rest/logs/` and confirm the trace shows explicit application-controlled HTTP sequencing.

## 4.3 Reflection gate

Before continuing, answer in `docs/observations/phase-00-rest.md`:

1. Which API calls were coded explicitly?
2. Where does deterministic branching live?
3. What happens when a new combination of questions is introduced?
4. What is simple and predictable about REST?
5. What becomes cumbersome as combinations increase?

Do not continue until Phase 0 is understood and approved.

---

# 5. Phase 1: Agentic

## 5.1 Authorisation prompt

```text
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
```

## 5.2 Verification

### Direct mode

```bash
TOOL_BACKEND=direct npm run agentic
```

Phase 0 must not be running or required.

### REST-backed mode

Terminal 1:

```bash
npm run rest
```

Terminal 2:

```bash
TOOL_BACKEND=rest npm run agentic
```

Run the same CUST-1005 prompt in both modes. Verify equivalent supported facts and forbidden-claim checks, while the logs show different execution transports.

### Expected distinction

```text
Direct:
Conversation -> Agent -> Tool -> Direct capability -> Domain service

REST-backed:
Conversation -> Agent -> Tool -> REST client -> REST API -> Domain service
```

## 5.3 Reflection gate

Compare Phase 0 with Phase 1:

1. Which hard-coded call sequences disappeared?
2. Which behaviours became probabilistic?
3. How reliable was tool selection?
4. How much did tool descriptions affect behaviour?
5. What controls became necessary?
6. What latency did REST-backed mode add?
7. Did REST reuse reduce duplication or add deployment coupling?
8. Was dynamic orchestration valuable for the test scenarios?

Do not continue until both Phase 1 modes are understood.

---

# 6. Phase 2: MCP

## 6.1 Authorisation prompt

```text
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
```

## 6.2 Verification

### MCP-direct

```bash
MCP_TOOL_BACKEND=direct npm run mcp
```

Phase 0 REST must not be required.

### MCP-over-REST

Terminal 1:

```bash
npm run rest
```

Terminal 2:

```bash
MCP_TOOL_BACKEND=rest npm run mcp
```

Verify the same business scenarios produce equivalent supported facts. Confirm Phase 2 logs prove that the MCP client discovered/called the MCP server and, in REST mode, the server called Phase 0 APIs.

## 6.3 Architecture comparison

At this gate, compare:

```text
A. REST
Application -> REST

B. Agentic direct
Agent -> Tool -> Domain

C. Agentic REST-backed
Agent -> Tool -> REST -> Domain

D. MCP direct
Agent -> MCP -> Tool -> Domain

E. MCP REST-backed
Agent -> MCP -> Tool -> REST -> Domain
```

## 6.4 Reflection gate

1. What did MCP standardise?
2. What became dynamically discoverable?
3. What additional process and protocol complexity appeared?
4. How did debugging change across MCP boundaries?
5. What did MCP add beyond Agent + REST?
6. Which capabilities are better represented as MCP tools?
7. Which knowledge is better represented as MCP resources?
8. Is MCP justified for this small implementation?

Do not proceed until these comparisons are documented.

---

# 7. Phase 3: A2A

## 7.1 Authorisation prompt

```text
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
```

## 7.2 Mandatory scenario

> CUST-1010 reports that the router keeps restarting. A replacement is ordered, £34.99 appears on the bill, and the customer says the router was promised free. Explain the situation and recommend what should happen next.

Expected responsibilities:

- **Service Agent:** equipment fault and replacement order evidence.
- **Billing Agent:** bill charge and unresolved dispute evidence.
- **Contract Agent:** contract status and whether contract evidence authorises a free replacement.
- **Support Orchestrator:** synthesis without declaring the disputed charge valid or invalid when evidence is insufficient.

## 7.3 Reflection gate

1. Which work genuinely benefited from a specialist agent?
2. Which capabilities should remain tools rather than agents?
3. What did A2A discovery/task lifecycle add?
4. How much context crossed agent boundaries?
5. How did latency and failure modes change?
6. How well were partial specialist failures handled?
7. When is REST sufficient?
8. When are direct agent tools sufficient?
9. When is MCP justified?
10. When is A2A justified?

---

# 8. Log-driven learning

Run the same supported scenario across phases and compare traces.

## REST

```text
Scenario
+- GET customer
+- GET service
+- GET billing
+- GET payments
+- GET faults
+- deterministic decision
```

## Agentic

```text
User
+- Model
+- tool selection
+- tool result
+- further tool selection
+- Model synthesis
+- response
```

## MCP

```text
User
+- Model
+- MCP tool request
| +- MCP server
| +- capability backend
+- MCP response
+- Model synthesis
```

## A2A

```text
User
+- Orchestrator
+- A2A -> Billing Agent -> MCP -> capability
+- A2A -> Service Agent -> MCP -> capability
+- A2A -> Contract Agent -> MCP -> capability
+- Orchestrator synthesis
```

Judge architectures using supported facts, failure handling, latency, operational complexity, trace clarity and ease of change. Do not assume the phase with the most components is the preferred design.

---

# 9. Approval checklist before each continuation

Use this checklist before authorising a new phase:

- [ ] Current phase builds successfully.
- [ ] Typecheck passes.
- [ ] Automated tests pass.
- [ ] Earlier phase regression tests pass.
- [ ] Mandatory scenarios were executed.
- [ ] Unsupported claims were not produced.
- [ ] A new JSONL log was generated.
- [ ] The trace can reconstruct execution.
- [ ] README contains exact run commands.
- [ ] Observation document is complete.
- [ ] Deviations are recorded.
- [ ] Earlier phase source remains unchanged unless a documented defect fix was necessary.
- [ ] The Vibe Agent has stopped and is awaiting approval.

---

# 10. Immediate starting instruction

Start a new project with the implementation plan, dataset and this guide. Give the Vibe Agent only the Phase 0 prompt from section 4.1.

Do not provide Phase 1 authorisation until you have personally:

1. run the REST server;
2. executed at least one deterministic complex scenario;
3. inspected the JSONL trace;
4. recorded Phase 0 observations;
5. confirmed that the application code, rather than an LLM, owned orchestration.