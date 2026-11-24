# Northstar Agent Lab: Complete Implementation Plan

## 1. Purpose

Build four independently runnable Node.js/TypeScript reference implementations over the same fictional Northstar Broadband dataset so the developer can pause after each phase, inspect traces, run identical scenarios, and understand exactly what REST, agentic tool use, MCP, and A2A add.

Phases:

- **Phase 0: REST** - deterministic application orchestration over HTTP APIs.
- **Phase 1: Agentic** - one conversational LLM agent calling local tools directly.
- **Phase 2: MCP** - one conversational agent accessing tools/resources through MCP.
- **Phase 3: A2A** - an orchestrator delegates domain work to independent specialist agents; agents use MCP for data/tool access.

This document is written as hand-off instructions for an implementation/coding agent.

---

# 2. Non-negotiable engineering rules

## 2.1 Phase isolation

Each phase is a standalone reference implementation.

1. Never implement a later phase by replacing an earlier phase.
2. Once a phase passes its exit gate, its phase-owned source code is frozen except for defects that prevent it running.
3. `01-agentic` must never depend on `02-mcp` or `03-a2a`.
4. `02-mcp` must never depend on `01-agentic` or `03-a2a`.
5. `03-a2a` must never depend on phase-owned code from earlier phases.
6. Sharing is allowed only through explicitly public packages under `shared/packages` and read-only fixtures under `shared/data` and `shared/knowledge`.
7. Changes to a shared public API must remain backward-compatible with every completed phase.
8. Every phase owns its entry point, configuration, tests, logs, README, and run scripts.
9. Each phase must have a standalone/default mode that runs without starting another phase. Later phases may additionally use the Phase 0 REST API as an optional capability backend, but REST-backed mode must never be the only execution path.
10. Do not silently refactor completed phase code while building a later phase.

## 2.2 Learning over abstraction

Do not hide the architectural distinction behind one universal framework. The implementations should visibly differ where the pattern differs.

- Phase 0 must contain explicit deterministic orchestration.
- Phase 1 must contain an explicit model/tool loop.
- Phase 2 must visibly cross an MCP client/server boundary.
- Phase 3 must visibly cross A2A agent boundaries.

## 2.3 No real customer data

Only use the supplied fictional Northstar data. Never substitute enterprise or personal data.

## 2.4 Observable tracing, not hidden reasoning

Log observable events: inputs, model requests/responses, tool selection, tool arguments, results, protocol requests, task transitions, timings, errors and final outputs. Do **not** ask models to reveal private chain-of-thought. If a decision explanation is needed, capture a short public reason such as `need_customer_payment_status`.

## 2.5 No invented operational success

A draft is not a submitted case. A pending payment is not settled. An available offer is not accepted. A target date is not a promise. Missing evidence must remain missing.

---

# 3. Runtime and baseline technology

Use:

- Node.js current supported LTS line.
- TypeScript with `strict: true`.
- npm workspaces.
- Zod for runtime schemas.
- Vitest for tests.
- Fastify for the REST reference API.
- JSONL structured logging.
- Official MCP TypeScript SDK in Phase 2/3.
- Official A2A JavaScript SDK in Phase 3.
- A provider-neutral LLM interface under `shared/packages/model-client`.

Pin concrete dependency versions in `package-lock.json`. Do not use floating `latest` ranges in committed package manifests.

---

# 4. Repository structure

Create exactly this high-level structure:

```text
northstar-agent-lab/
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
│
├── shared/
│ ├── README.md
│ ├── data/
│ │ ├── customers.json
│ │ ├── services.json
│ │ ├── orders.json
│ │ ├── billing-accounts.json
│ │ ├── bills.json
│ │ ├── payments.json
│ │ ├── billing-cases.json
│ │ ├── faults.json
│ │ ├── network-incidents.json
│ │ ├── contracts.json
│ │ ├── contract-events.json
│ │ └── offers.json
│ ├── knowledge/
│ │ └── *.md
│ └── packages/
│ ├── domain-model/
│ ├── data-access/
│ ├── knowledge-search/
│ ├── domain-services/
│ ├── logger/
│ ├── model-client/
│ ├── rest-client/
│ ├── capability-contracts/
│ └── scenario-kit/
│
├── phases/
│ ├── 00-rest/
│ │ ├── README.md
│ │ ├── package.json
│ │ ├── .env.example
│ │ ├── src/
│ │ │ ├── server.ts
│ │ │ ├── app.ts
│ │ │ ├── routes/
│ │ │ ├── controllers/
│ │ │ └── scenarios/
│ │ ├── tests/
│ │ └── logs/
│ │
│ ├── 01-agentic/
│ │ ├── README.md
│ │ ├── package.json
│ │ ├── .env.example
│ │ ├── src/
│ │ │ ├── index.ts
│ │ │ ├── cli.ts
│ │ │ ├── agent/
│ │ │ └── tools/
│ │ ├── tests/
│ │ └── logs/
│ │
│ ├── 02-mcp/
│ │ ├── README.md
│ │ ├── package.json
│ │ ├── .env.example
│ │ ├── src/
│ │ │ ├── client/
│ │ │ └── server/
│ │ ├── tests/
│ │ └── logs/
│ │
│ └── 03-a2a/
│ ├── README.md
│ ├── package.json
│ ├── .env.example
│ ├── src/
│ │ ├── orchestrator-agent/
│ │ ├── billing-agent/
│ │ ├── service-agent/
│ │ ├── contract-agent/
│ │ └── mcp/
│ ├── tests/
│ └── logs/
│
└── docs/
├── architecture/
├── scenarios/
├── observations/
└── decisions/
```

---

# 5. Shared package boundaries

The shared folder is not a dumping ground. Every package has one purpose and a small public API. No shared package may contain phase-specific orchestration.

## 5.1 `@northstar/domain-model`

**Owns:** Zod schemas and TypeScript types for IDs, customers, services, orders, billing accounts, bills, payments, billing cases, faults, incidents, contracts, contract events, offers, knowledge search results, errors and safe result envelopes.

**May import:** Zod only.

**Must not import:** data-access, logger, model SDK, Fastify, MCP or A2A.

**Public API examples:** `CustomerSchema`, `PaymentSchema`, `FaultSchema`, `ContractSchema`, `DomainError`, `Result<T>`.

## 5.2 `@northstar/data-access`

**Owns:** read-only loading, indexing and lookup of JSON fixtures.

**May import:** domain-model.

**Must not own:** agent tools, HTTP routes, MCP registration or business conclusions.

**Public API examples:** `getCustomerById`, `findCustomers`, `getServicesByCustomer`, `getPaymentsByAccount`, `getFaultsByCustomer`, `getContractByService`.

Return explicit `not_found`/`ambiguous` results instead of `undefined` where business calls require certainty.

## 5.3 `@northstar/knowledge-search`

**Owns:** loading Markdown knowledge, frontmatter parsing, deterministic lexical ranking and excerpts.

First implementation is lexical, not vector search. Return top 3 results by default with `articleId`, title, score, file name and excerpt.

**Must not invoke an LLM.**

## 5.4 `@northstar/domain-services`

**Owns:** small deterministic capabilities reusable across transports. Examples:

- retrieve customer context;
- retrieve billing account/bills/payments/cases separately;
- retrieve service/fault/incident context separately;
- retrieve contract/events/offers separately;
- create a support-case **draft** object;
- format safe domain results.

Do not create `getEverythingAboutCustomer`. The architecture needs granular capabilities so decisioning remains visible.

**Must not contain:** REST, agent loops, MCP, A2A, or model prompts.

## 5.5 `@northstar/logger`

**Owns:** JSONL writer, correlation IDs, event schemas, redaction, truncation, duration helpers and human-readable log viewer.

Required correlation identifiers:

```text
runId
sessionId
turnId
requestId
modelCallId
toolCallId
mcpRequestId
taskId / a2aTaskId
```

Use the identifiers only where relevant to the phase.

Never log API keys, Authorization headers or secrets.

## 5.6 `@northstar/model-client`

**Owns:** provider-neutral interface for LLM conversations and tool calling.

```ts
interface ModelClient {
complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
}
```

Include both:

- a real provider adapter selected by environment configuration;
- `MockModelClient` for deterministic integration tests.

This package must not know about Northstar tools.

## 5.7 `@northstar/rest-client`

**Owns:** a typed HTTP client for the Phase 0 REST capability surface. It allows later phases to reuse the same REST APIs without importing Phase 0 source code.

**May import:** domain-model and capability-contracts.

**Must not import:** Fastify server internals, agent loops, MCP or A2A.

**Public API examples:** `RestCustomerCapability`, `RestBillingCapability`, `RestFaultCapability`, `RestContractCapability`, `RestKnowledgeCapability`.

Configuration:

```text
NORTHSTAR_REST_BASE_URL=http://localhost:3000
REST_REQUEST_TIMEOUT_MS=5000
```

The client must validate response envelopes and payloads with Zod. HTTP errors must be normalised to the same domain/capability error model used by direct implementations.

## 5.8 `@northstar/capability-contracts`

**Owns:** transport-neutral capability interfaces and request/response contracts. This is the abstraction that lets a tool invoke either a direct domain-service adapter or a REST adapter without changing the tool exposed to the model.

Example:

```ts
interface BillingCapabilities {
getBillingAccount(customerId: CustomerId): Promise<Result<BillingAccount>>;
getBills(billingAccountId: BillingAccountId): Promise<Result<Bill[]>>;
getPayments(billingAccountId: BillingAccountId): Promise<Result<Payment[]>>;
getBillingCases(customerId: CustomerId): Promise<Result<BillingCase[]>>;
}
```

Provide two adapters where relevant:

```text
DirectCapabilities -> shared domain-services -> data/knowledge
RestCapabilities -> HTTP -> Phase 0 REST API -> domain-services -> data/knowledge
```

The tool schema presented to an LLM or MCP client must remain the same regardless of backend. The backend changes execution transport, not the semantic capability.

**Must not contain:** orchestration, model prompts, MCP registration or A2A delegation.

## 5.9 `@northstar/scenario-kit`

**Owns:** standard evaluation scenarios and expected observable outcomes so all phases can be compared.

A scenario should specify:

```ts
{
id,
userPrompt,
expectedFacts,
forbiddenClaims,
relevantDomains,
expectedOutcomeCategory
}
```

It must not prescribe the internal call order for agentic phases.

---

# 5A. Optional REST-backed capability mode

Phase 0 REST APIs are a reusable deterministic capability surface. Later phases must support their native standalone mode, and may additionally support REST-backed mode so the same agent/tool semantics can be compared across transports.

## Required modes

### Phase 1

```text
TOOL_BACKEND=direct # default; Agent -> local tool -> domain-services
TOOL_BACKEND=rest # optional; Agent -> local tool -> REST client -> Phase 0 REST API
```

### Phase 2

```text
MCP_TOOL_BACKEND=direct # default; MCP server -> domain-services
MCP_TOOL_BACKEND=rest # optional; MCP server -> REST client -> Phase 0 REST API
```

### Phase 3

```text
A2A_CAPABILITY_BACKEND=mcp-direct # default; specialist -> MCP -> domain-services
A2A_CAPABILITY_BACKEND=mcp-rest # optional; specialist -> MCP -> REST -> Phase 0 REST API
```

Do not add a mode that bypasses A2A in Phase 3. A2A remains the agent-to-agent boundary; only the specialist's downstream capability backend changes.

## Backend factory

Each applicable phase owns a small backend factory such as:

```ts
createCapabilities(config): CapabilitySet
```

It selects an implementation of shared capability interfaces. Do not scatter environment-variable checks throughout individual tools.

## Semantic parity rule

For the same valid request, direct and REST-backed adapters must return semantically equivalent typed results and normalised errors. Add parity tests for representative success, not-found, ambiguous and invalid-input cases.

## Operational rule

REST-backed modes may require the Phase 0 REST server to be running. They are explicitly optional comparison modes. Default/native modes must remain independently runnable. A missing REST server must produce a clear capability-unavailable error, never a fallback that silently changes transport.

## Logging

Logs must state the selected backend at run startup:

```text
capability.backend.selected = direct | rest | mcp-direct | mcp-rest
```

REST-backed calls also log `rest.client.request.started/completed/failed` with URL path (not secrets), requestId, status and duration. This makes the additional hop measurable.

---

# 6. Root workspace and scripts

Root scripts should provide explicit phase entry points:

```json
{
"scripts": {
"build": "...all packages...",
"test": "...all tests...",
"rest": "npm --workspace phases/00-rest run start",
"rest:dev": "npm --workspace phases/00-rest run dev",
"rest:test": "npm --workspace phases/00-rest test",
"agentic": "npm --workspace phases/01-agentic run start",
"agentic:test": "npm --workspace phases/01-agentic test",
"mcp": "npm --workspace phases/02-mcp run start",
"mcp:test": "npm --workspace phases/02-mcp test",
"a2a": "npm --workspace phases/03-a2a run start",
"a2a:test": "npm --workspace phases/03-a2a test"
}
}
```

Exact command plumbing can differ, but these user-facing commands must work.

---

# 7. Phase 0 - Deterministic REST baseline

## Goal

Demonstrate traditional deterministic integration before using an LLM. The application code decides exactly which APIs to call and how to branch.

## Architecture

```text
Scenario Client -> HTTP REST API -> Domain Services -> Data / Knowledge
```

There is no LLM, MCP or A2A.

## Step 0.1 - Scaffold

1. Create `phases/00-rest` workspace.
2. Add Fastify.
3. Add phase-local config and log path.
4. Start API on configurable `REST_PORT`, default `3000`.
5. Implement `/health`.

Exit: `curl localhost:3000/health` returns an explicit healthy result.

## Step 0.2 - Implement resource APIs

Recommended endpoints:

```text
GET /customers/:id
GET /customers/:id/services
GET /customers/:id/orders
GET /customers/:id/billing-account
GET /billing/accounts/:id/bills
GET /billing/accounts/:id/payments
GET /customers/:id/billing-cases
GET /customers/:id/faults
GET /network-incidents
GET /customers/:id/contracts
GET /knowledge/search?q=...
POST /support-case-drafts
```

Use consistent envelopes:

```json
{"ok":true,"data":{}}
```

or

```json
{"ok":false,"error":{"code":"NOT_FOUND","message":"..."}}
```

Use 400 for invalid input, 404 for absent resources, 409 when a unique lookup is ambiguous, and 500 only for unexpected server errors.

## Step 0.3 - Build deterministic scenario clients

Implement several scenario functions that call REST endpoints explicitly. The complex CUST-1005 scenario must visibly code the sequence for service, billing, payments, billing case and faults.

Do not use an LLM to decide the calls or write the response.

## Step 0.4 - REST logging

Create a new log per run under `00-rest/logs` and log:

```text
run.started
http.request.started
http.request.completed
scenario.step
scenario.decision
scenario.completed
run.completed
```

Include request paths, status codes and durations. Redact secrets.

## Step 0.5 - Tests

Test every endpoint, invalid IDs, absent records, ambiguity and at least five deterministic scenarios.

## Phase 0 exit gate

Before moving on:

- `npm run rest` works by itself.
- all REST tests pass;
- CUST-1005 produces the correct pending-payment/access-restriction result;
- CUST-1008 does not invent a pending bill total or contract end date;
- CUST-1010 does not treat replacement order as evidence that the disputed fee is valid;
- JSONL trace reconstructs the REST calls.

## Pause and reflect

Record observations in `docs/observations/phase-00-rest.md`:

1. Which call sequences had to be explicitly programmed?
2. How much domain branching was embedded in orchestration code?
3. What happens when the user asks a new combination of questions?
4. What is simple/predictable about REST?
5. What becomes cumbersome as query combinations grow?

**STOP here. Do not implement Phase 1 until the user explicitly tells you to continue.**

---

# 8. Phase 1 - Direct agentic tool calling

## Goal

Replace deterministic call sequencing with a conversational agent that decides which local tools it needs. Keep tools in-process so the learning focus is solely agentic behaviour.

## Architecture

```text
CLI -> Agent Loop -> Model
<-> Local Tool Registry -> Shared Domain Services
```

No MCP. No A2A. Default mode calls domain services directly. An optional comparison mode may invoke the Phase 0 REST APIs through `@northstar/rest-client`.

## Step 1.1 - Freeze Phase 0

Before writing code:

1. Run Phase 0 tests.
2. Record the result.
3. Do not modify `phases/00-rest` while implementing Phase 1.

## Step 1.2 - Conversational CLI

Implement:

```text
/help
/new
/state
/log
/quit
```

Maintain in-memory session state. Do not add durable conversation memory yet.

## Step 1.3 - Define granular agent tools

Initial tools:

```text
findCustomer
getCustomerServices
getCustomerOrders
getBillingAccount
getBills
getPayments
getBillingCases
getFaults
getNetworkIncidents
getContracts
getContractEvents
getOffers
searchKnowledge
draftSupportCase
```

Each has:

- name and unambiguous description;
- Zod input/output schema;
- read-only/write-like classification;
- deterministic handler backed by shared domain services;
- clear errors.

`draftSupportCase` must only return a `DRAFT` object.

## Step 1.3A - Add optional REST-backed tool execution

Keep the tool names, descriptions, Zod schemas and model-visible semantics identical in both modes.

```text
TOOL_BACKEND=direct
Agent -> tool -> DirectCapabilities -> domain-services

TOOL_BACKEND=rest
Agent -> tool -> RestCapabilities -> HTTP -> Phase 0 REST API
```

Requirements:

1. `direct` is the default.
2. `rest` requires `NORTHSTAR_REST_BASE_URL`.
3. No tool may know which backend it is using beyond the injected capability interface.
4. Do not import Phase 0 source. Reuse its public HTTP contract only.
5. Add adapter parity tests.
6. Run at least S03, S06 and S09 in both modes and compare facts, forbidden claims, latency and logs.

## Step 1.4 - System instructions

Agent instructions must establish:

- use tools for Northstar factual claims;
- distinguish settled/pending/failed payment;
- distinguish fault, incident, order and billing restriction;
- never calculate unsupported termination charges;
- unresolved disputes remain unresolved;
- retrieve contract state before contract conclusions;
- ask for clarification on ambiguous identity;
- do not claim side effects that did not occur;
- cite record IDs in responses when useful for learning/debugging.

## Step 1.5 - Explicit agent loop

Do not start with a large orchestration framework. Implement the core loop visibly:

```text
user input
-> model call
-> zero/multiple tool requests
-> schema validation
-> tool execution
-> results back to model
-> repeat or final response
```

Controls:

- maximum 6 agent iterations per turn;
- 30-second turn timeout by default;
- reject unknown tools;
- validate arguments;
- catch/tool-normalise failures;
- permit multiple safe reads;
- abort cleanly on iteration limit.

## Step 1.6 - Agent logging

Log:

```text
user.message.received
model.requested
model.responded
tool.requested
tool.started
tool.completed
tool.failed
agent.iteration.completed
assistant.response.sent
```

Do not log hidden reasoning. Make the tool path reconstructable.

## Step 1.7 - Tests

Mock-model integration tests must cover:

- no-tool answer;
- single tool;
- multiple sequential tools;
- parallel safe reads if supported;
- clarification for ambiguous customer;
- malformed tool request;
- unknown tool;
- tool failure;
- iteration limit;
- unsupported conclusion prevention.

Run the standard scenario kit against the real model separately from deterministic CI tests.

## Phase 1 exit gate

- Phase 0 still passes unchanged.
- `npm run agentic` works in default direct mode without REST, MCP or A2A running.
- optional `TOOL_BACKEND=rest` mode works when the Phase 0 REST server is running and produces equivalent business facts.
- tool selection is visible in logs;
- complex scenarios require multiple tools;
- forbidden claims are absent from evaluation results;
- direct local tool calls are clearly visible in code.

## Pause and reflect

Write `docs/observations/phase-01-agentic.md` comparing Phase 0 and Phase 1:

1. Which hard-coded REST call sequences disappeared?
2. Which behaviours became probabilistic?
3. How reliable was tool choice?
4. How important were tool descriptions?
5. Which controls became necessary because an LLM now orchestrates?
6. Was the added flexibility worth the loss of deterministic flow?

**STOP. Do not implement MCP until explicitly asked to continue.**

---

# 9. Phase 2 - MCP

## Goal

Keep a single conversational agent, but move capability/resource access across a genuine MCP boundary. This phase exists to isolate the value/cost of MCP from A2A.

## Architecture

```text
CLI -> Agent/MCP Host -> MCP Client
|
MCP boundary
|
MCP Server
/ \
Tools Resources
-> Shared packages
```

## Step 2.1 - Freeze prior phases

Run Phase 0 and Phase 1 test suites and record results. Do not alter their phase-owned code.

## Step 2.2 - MCP server

Create the server under `02-mcp/src/server` using the official TypeScript SDK.

Expose granular tools equivalent in business capability to Phase 1. Preserve tool semantics so comparison is fair.

Expose knowledge articles as MCP resources where appropriate. Keep `searchKnowledge` as a tool if query-based retrieval is required, while resources demonstrate direct resource reading.

## Step 2.2A - MCP tool backend modes

MCP tools must use transport-neutral capability interfaces and support:

```text
MCP_TOOL_BACKEND=direct
Agent -> MCP -> MCP tool -> DirectCapabilities -> domain-services

MCP_TOOL_BACKEND=rest
Agent -> MCP -> MCP tool -> RestCapabilities -> HTTP -> Phase 0 REST API
```

`direct` is the default. MCP tool discovery, names and schemas must not change between backend modes. The point is to compare what sits behind the MCP server without changing the model-facing/mcp-facing capability.

Add parity tests and run S03, S06 and S09 through both modes.

## Step 2.3 - Transport

Start with local `stdio` because it makes the protocol boundary tangible without authentication/network deployment complexity.

Do not begin with remote HTTP. Add remote transport only as an optional observation after stdio passes the gate.

## Step 2.4 - MCP host/client agent

Build a new agent implementation in `02-mcp/src/client`.

It should:

1. establish MCP session;
2. discover/list available tools;
3. translate MCP tool metadata to the model's callable tool representation;
4. receive model tool selection;
5. call MCP tool;
6. return result to model;
7. support resource listing/reading as implemented;
8. handle MCP server failures without inventing results.

Do not import Phase 1's tool registry.

## Step 2.5 - MCP logging

Use separate logical event categories for host and server:

```text
mcp.client.connected
mcp.tools.listed
mcp.tool.requested
mcp.tool.completed
mcp.resource.read
mcp.server.request.received
mcp.server.tool.executed
mcp.server.response.sent
```

Correlate host and server with `mcpRequestId` where possible.

## Step 2.6 - Comparison scenario

Run the same CUST-1005 prompt from Phase 1. The business conclusion should be equivalent, while the log must show that capabilities crossed MCP rather than direct JS function calls.

## Step 2.7 - Tests

Test:

- MCP handshake/session;
- tool discovery;
- tool schema exposure;
- successful invocation;
- invalid arguments;
- unknown tool;
- server termination;
- timeout;
- resource read;
- agent recovery from MCP errors.

## Phase 2 exit gate

- Phase 0 and 1 still run independently.
- `npm run mcp` in default `MCP_TOOL_BACKEND=direct` mode does not require Phase 0/1 processes.
- optional `MCP_TOOL_BACKEND=rest` mode works against a separately running Phase 0 REST API and does not import Phase 0 source code.
- MCP tool discovery is real, not a hard-coded imitation.
- server and host traces can be correlated.
- same scenario produces materially equivalent business facts to Phase 1.

## Pause and reflect

Write `docs/observations/phase-02-mcp.md`:

1. What did MCP standardise?
2. What additional runtime/process complexity appeared?
3. What became discoverable rather than compiled directly into the app?
4. How did debugging change across client/server boundaries?
5. For this small app, where is MCP beneficial and where is direct REST/tool calling simpler?
6. Which Northstar capabilities are good MCP tools versus MCP resources?

**STOP. Do not implement A2A until explicitly asked.**

---

# 10. Phase 3 - A2A plus MCP

## Goal

Introduce separate responsibility-owning agents and use A2A for delegation. MCP remains the tool/data access pattern inside this phase.

Do not split into agents merely by data file. Agents need coherent business responsibility.

## Proposed agents

### Support Orchestrator Agent

Owns the user conversation, decomposes cross-domain requests, delegates, reconciles responses and gives the final answer.

### Billing Agent

Owns bills, balances, payments, disputes and billing knowledge. It can state evidence and decision status but cannot fabricate dispute outcomes.

### Service Agent

Owns services, faults, incidents, orders/activation and fault knowledge.

### Contract Agent

Owns contract status, contract events, offers and contractual interpretation. It may state contract facts but cannot calculate an unsupported termination charge or promise fee-free cancellation.

## Architecture

```text
User
|
Support Orchestrator
| A2A
+-------- Billing Agent ---- MCP ----+
| |
+-------- Service Agent ---- MCP -----+--> Northstar MCP capability layer
| |
+-------- Contract Agent --- MCP -----+
```

## Step 3.1 - Freeze earlier phases

Run all Phase 0/1/2 tests and record results. Do not alter their phase-owned source.

## Step 3.2 - Specialist capability contracts

For every specialist publish what it can handle and what it cannot decide. Make this discoverable through the A2A mechanism/Agent Cards supported by the official SDK.

Avoid overlapping ownership where possible.

## Step 3.3 - A2A communication

Implement independent agent services with distinct configurable ports, for example:

```text
orchestrator 4100
billing 4101
service 4102
contract 4103
```

Use A2A messages/tasks for agent delegation. Do not replace A2A with ordinary internal function calls and label them A2A.

Start with synchronous/short-running tasks. Add streaming only after normal task lifecycle works.

## Step 3.4 - Minimum delegation context

Send only what the specialist needs. Prefer stable identifiers, the user's relevant question and known verified context. Do not dump the entire conversation or full customer record into every agent.

## Step 3.5 - Specialist MCP access

Specialists use MCP capabilities needed for their domain. They must not import shared JSON files directly from agent code. The point of Phase 3 is to make both boundaries visible:

```text
A2A = agent responsibility boundary
MCP = tool/data capability boundary
```

## Step 3.5A - Optional REST-backed MCP capabilities

Preserve A2A and MCP boundaries in both modes:

```text
A2A_CAPABILITY_BACKEND=mcp-direct
Orchestrator -> A2A -> Specialist -> MCP -> domain-services

A2A_CAPABILITY_BACKEND=mcp-rest
Orchestrator -> A2A -> Specialist -> MCP -> REST -> Phase 0 REST API
```

`mcp-direct` is the default. Never implement `A2A_CAPABILITY_BACKEND=rest` that bypasses MCP, because that would change two architectural variables simultaneously and weaken the comparison.

## Step 3.6 - Orchestration

Orchestrator must be able to:

- delegate to one specialist;
- delegate to multiple specialists for cross-domain questions;
- combine non-conflicting results;
- expose unresolved disagreement/evidence gaps;
- deal with one specialist failing while others succeed;
- avoid converting `PENDING` into a final conclusion.

## Step 3.7 - End-to-end tracing

Every delegated request receives an `a2aTaskId`. Propagate/correlate:

```text
runId -> sessionId -> turnId -> a2aTaskId -> mcpRequestId -> toolCallId
```

Keep per-process log files, plus provide a log-view command capable of merging events chronologically by correlation IDs.

## Step 3.8 - Complex demonstration

Mandatory scenario:

> CUST-1010 reports a restarting router. A replacement is ordered, £34.99 appears on the bill, and the customer says the replacement was promised free. Explain the situation and what should happen next.

Expected delegation:

- Service Agent: equipment fault and replacement order context.
- Billing Agent: charge and unresolved dispute evidence.
- Contract Agent: relevant contract status and whether contract data itself authorises a free replacement.
- Orchestrator: synthesise facts without declaring the disputed fee valid/invalid absent evidence.

## Step 3.9 - A2A tests

Test:

- agent discovery/capability metadata;
- single delegation;
- multi-agent delegation;
- unavailable specialist;
- specialist timeout;
- malformed task;
- partial success;
- contradictory specialist statements;
- cross-agent correlation IDs;
- duplicate/idempotent task handling where applicable;
- final synthesis with unresolved evidence.

## Phase 3 exit gate

- all four phases are independently runnable;
- earlier phase tests still pass;
- A2A is genuinely used between independent agent processes;
- MCP is genuinely used for specialist capability access;
- end-to-end traces show both protocol boundaries;
- Phase 3 solves the standard scenarios without inventing unsupported facts.

## Final reflection

Write `docs/observations/phase-03-a2a.md` covering:

1. Which work genuinely benefited from independent ownership?
2. Which calls should have remained tools rather than agents?
3. What complexity did discovery/task lifecycle introduce?
4. What context had to cross agent boundaries?
5. What happened to latency and failure modes as hops increased?
6. When would REST be the better choice?
7. When would direct agent tools be sufficient?
8. When does MCP provide practical value?
9. When does A2A justify its operational cost?
10. Did REST-backed capability reuse reduce duplication, or mainly add latency/deployment coupling?

---

# 11. Standard cross-phase scenarios

At minimum implement these in `scenario-kit`:

| ID | Prompt intent | Key trap |
|---|---|---|
| S01 | Customer/service lookup | straightforward grounding |
| S02 | Delayed activation | review date is not completion promise |
| S03 | Payment status | failed payment + pending retry |
| S04 | Billing dispute | charge exists, validity unresolved |
| S05 | Total-loss fault | existing engineer action |
| S06 | Fault vs restriction | healthy line but billing-blocked access |
| S07 | Contract end | NOT_STARTED contract has no term end yet |
| S08 | Performance + contract | below minimum plus network incident does not equal automatic cancellation |
| S09 | Cross-domain equipment issue | fault + order + charge + dispute + contract |
| S10 | Ambiguous identity | surname matches multiple customers |

Keep expected **facts and forbidden claims** consistent across phases, but do not require identical internal call sequences.

---

# 12. Logging specification

Every run creates a new `.jsonl` file. Event shape:

```json
{
"timestamp": "ISO-8601",
"level": "INFO",
"phase": "01-agentic",
"component": "agent",
"event": "tool.completed",
"runId": "run_x",
"sessionId": "session_x",
"turnId": "turn_x",
"correlation": {},
"durationMs": 12,
"data": {}
}
```

Provide a shared log viewer but store phase logs in each phase folder. The viewer must support:

```text
npm run log:view -- <file>
```

and by Phase 3, merged multi-file view.

Apply maximum logged payload sizes and mark truncation explicitly.

---

# 13. Security and failure rules

Applicable to every phase:

- Validate all untrusted input through Zod.
- Never log credentials.
- Use `.env`, never committed real secrets.
- Do not expose stack traces to conversational users.
- Add request, tool, model and agent timeouts.
- Avoid automatic retries for write-like operations.
- Fixture access is read-only.
- `draftSupportCase` creates no external side effect.
- Treat model output as untrusted until tool arguments are validated.
- In Phase 2/3, do not trust protocol calls solely because they came through MCP/A2A; keep capability and argument validation.

---

# 14. Documentation required from the implementation agent

For each phase README include:

1. purpose;
2. architecture diagram in Mermaid or text;
3. dependencies;
4. environment variables;
5. install/build/run/test commands;
6. example conversation/request;
7. log location and viewer command;
8. limitations;
9. exact differences from the previous phase;
10. supported capability backend modes and startup commands;
11. exit-gate checklist.

At root, maintain a comparison table:

```text
REST -> code owns orchestration
Agentic -> model owns dynamic tool selection
MCP -> standard protocol boundary for tools/resources
A2A -> standard boundary for inter-agent collaboration/delegation
```

---

# 15. Instructions to the coding/vibe agent

Follow these working rules:

1. Implement **only one phase at a time**.
2. Begin with shared foundations and Phase 0 only.
3. At the end of a phase, run build, typecheck and tests.
4. Run the mandatory scenarios.
5. Verify logs were created.
6. Update that phase README and observation template.
7. Present a concise completion report including failures/limitations.
8. **STOP and wait for explicit user instruction before starting the next phase.**
9. Never use the pause as permission to pre-build code for later phases.
10. Before beginning a later phase, re-run previous-phase tests.
11. Never modify an earlier phase simply to make a later implementation easier.
12. If shared code must change, preserve its public contract or make a backward-compatible additive change followed by regression tests across completed phases.
13. Prefer simple, inspectable code over clever abstraction.
14. Do not hide protocol boundaries behind mocks in production paths. Mocks are for tests only.
15. Keep a `docs/decisions/` ADR for any material deviation from this plan.
16. REST-backed modes are optional comparison modes. Never make a later phase dependent on Phase 0 REST for its default execution.
17. Keep model-visible tool contracts stable when switching between direct and REST-backed implementations.
18. Never silently fall back from REST to direct mode or vice versa; fail explicitly so traces remain trustworthy.

---

# 16. First implementation instruction

The first prompt to the coding agent should be:

> Read `northstar_implementation_plan.md` completely. Implement only the shared foundations required by Phase 0 and then implement Phase 0 REST. Do not implement, scaffold, install protocol-specific dependencies for, or modify code for Phase 1, 2 or 3 beyond creating their empty directory placeholders if required by the repository structure. Use the supplied Northstar fictional dataset unchanged. Run Phase 0 build/typecheck/tests and the mandatory Phase 0 scenarios, verify JSONL logs, complete `phases/00-rest/README.md` and `docs/observations/phase-00-rest.md`, then STOP. Report what was implemented, test results, exact commands to run it, log locations, and any deviations from the plan. Wait for explicit approval before Phase 1.

---

# 17. Final intended learning progression

```text
PHASE 0 - REST
Developer-coded orchestration
|
| PAUSE / inspect code + logs
v
PHASE 1 - AGENTIC
Model-selected direct tools
+ optional REST-backed tools
|
| PAUSE / compare direct vs REST-backed and REST baseline
v
PHASE 2 - MCP
Model-selected capabilities across MCP boundary
+ optional REST-backed MCP tools
|
| PAUSE / compare direct tools, MCP-direct, and MCP-over-REST
v
PHASE 3 - A2A
Independent agents delegate over A2A and access tools/data over MCP
+ optional MCP-over-REST capability backend
|
v
FINAL CROSS-PHASE COMPARISON
```

Do not judge the final architecture solely by which phase is most sophisticated. The purpose of the lab is to understand which pattern earns its complexity for a given problem.