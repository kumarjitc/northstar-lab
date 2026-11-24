# Phase 1 — Conversational Agentic tool calling

## Purpose

Replace Phase 0’s hard-coded call sequences with a conversational agent that selects granular tools. Default mode calls domain services in-process. Optional mode calls the same tool semantics through Phase 0 REST.

## Architecture

```text
CLI
 └─ Agent loop (explicit model/tool iterations)
      ├─ ModelClient (openai-compatible | mock)
      └─ Tool registry (identical schemas in both modes)
           └─ CapabilitySet
                ├─ TOOL_BACKEND=direct → domain-services → fixtures
                └─ TOOL_BACKEND=rest   → rest-client → Phase 0 HTTP → domain-services
```

No MCP. No A2A.

## Capability backend modes

| Mode | Env | Requires Phase 0 process? |
|---|---|---|
| `direct` (default) | `TOOL_BACKEND=direct` | No |
| `rest` | `TOOL_BACKEND=rest` + `NORTHSTAR_REST_BASE_URL` | Yes |

Tool names/descriptions/schemas exposed to the model are identical. Backend selection is only in `createCapabilities()`.

## Dependencies

- `@northstar/capability-contracts`
- `@northstar/rest-client`
- `@northstar/model-client`
- `@northstar/domain-services`, `data-access`, `domain-model`, `logger`, `scenario-kit`

Does **not** import `phases/00-rest` source in the runtime path (tests may boot REST in-process for parity).

## Environment

See `.env.example`. Important:

```bash
TOOL_BACKEND=direct|rest
NORTHSTAR_REST_BASE_URL=http://127.0.0.1:3000
MODEL_PROVIDER=mistral
MODEL_API_KEY=...                 # or MISTRAL_API_KEY
MODEL_NAME=mistral-small-latest   # or mistral-large-latest
MODEL_BASE_URL=https://api.mistral.ai/v1
```

## Commands

```bash
# tests (mock model; includes direct↔REST parity)
npm run agentic:test

# direct mode CLI with Mistral (no REST server needed)
TOOL_BACKEND=direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run agentic

# REST-backed mode CLI
npm run rest   # terminal 1
TOOL_BACKEND=rest MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run agentic

# optional live scenario eval
TOOL_BACKEND=direct MODEL_PROVIDER=mistral MODEL_API_KEY=... npm run agentic:eval

# traces
npm run agentic:trace
# or
npm run log:viewer -- --open
```

CLI commands: `/help` `/new` `/state` `/log` `/quit`

## Example

```text
you> CUST-1005 says payment has been made, but broadband is still unavailable.
agent> ... uses getBillingAccount, getPayments, getFaults, getCustomerServices ...
```

## Logging

`phases/01-agentic/logs/*.jsonl`

Events: `capability.backend.selected`, `user.message.received`, `model.*`, `tool.*`, `agent.iteration.completed`, `assistant.response.sent`, plus `rest.client.request.*` when `TOOL_BACKEND=rest`.

## Differences from Phase 0

- Phase 0: application code owns the call sequence.
- Phase 1: the model selects tools dynamically; the same business capabilities are reused.
- Optional REST mode adds an HTTP hop without changing tool semantics.

## Limitations

- Needs a model API key for interactive use (tests use `MockModelClient`).
- Max 6 tool iterations and 30s turn timeout by default.
- In-memory session only (`/new` clears it).
- `draftSupportCase` creates DRAFT objects only.

## Exit-gate checklist

- [x] Phase 0 still passes unchanged
- [x] `npm run agentic` works in direct mode without REST/MCP/A2A
- [x] `TOOL_BACKEND=rest` supported via shared rest-client
- [x] Tool selection visible in logs
- [x] Direct↔REST parity tests
- [x] Observation draft written
