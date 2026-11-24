# Phase 1 observations — Agentic

Recorded after implementing Phase 1 with `TOOL_BACKEND=direct|rest`.

## 1. Which hard-coded REST call sequences disappeared?

Phase 0 scenario runners explicitly sequenced customer → services → billing → payments → cases → faults. In Phase 1 those sequences are no longer coded in orchestration; the model chooses tools per turn. The capabilities themselves remain granular (no `getEverythingAboutCustomer`).

## 2. Which behaviours became probabilistic?

Tool choice, tool ordering, clarification wording, and final synthesis are model-dependent. With a live model, the same prompt can vary. Deterministic CI therefore uses `MockModelClient` scripted turns; live `agentic:eval` is separate.

## 3. How reliable was tool choice?

Under scripted tests, required multi-tool paths for S03/S06/S09 are enforced by the mock. Live reliability depends on tool descriptions and system instructions. Ambiguous identity (Patel) is explicitly covered in instructions and tools.

## 4. How important were tool descriptions?

Critical. Descriptions encode payment/fault/contract traps (PENDING ≠ settled, BLOCKED ≠ physical fault, NOT_STARTED has no end date, draft ≠ submitted). Weak descriptions would reintroduce Phase 0’s failure modes as hallucinations.

## 5. Which controls became necessary because an LLM now orchestrates?

- Max iterations (6) and turn timeout (30s)
- Zod validation of tool arguments
- Unknown-tool rejection
- Normalised tool errors returned to the model
- System prompt guardrails for unsupported conclusions
- Explicit backend selection with no silent fallback (`direct` vs `rest`)

## 6. What latency did REST-backed mode add?

Parity tests boot Phase 0 and compare facts; REST adds HTTP serialisation and network hop. Logs emit `rest.client.request.started/completed` with durations so the extra hop is measurable per call.

## 7. Did REST reuse reduce duplication or add deployment coupling?

Reuse: tool schemas stay identical; Phase 0 becomes a capability backend without importing its source. Coupling: `TOOL_BACKEND=rest` requires the REST process; a down server returns explicit `UNAVAILABLE` (no silent switch to direct).

## 8. Was dynamic orchestration valuable for the test scenarios?

Yes for open-ended follow-ups and mixed questions. For fixed CUST-1005 diagnosis, Phase 0 remains clearer and fully deterministic. Phase 1 earns complexity when prompts vary.

## Evidence

- `npm run agentic:test` — 16 passed (loop, parity, scripted S03/S06/S09)
- `npm run rest:test` — 18 passed (Phase 0 regression)
- Direct mode requires no Phase 0 process
- REST mode uses `@northstar/rest-client` only

## Approval note

Phase 1 is ready for review. Phase 2 (MCP) must not start until explicitly approved.
