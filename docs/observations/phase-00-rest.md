# Phase 0 observations — REST

Recorded after implementing and running the deterministic REST baseline.

## 1. Which API calls were coded explicitly?

For CUST-1005 the scenario runner hard-codes this sequence:

1. customer
2. services
3. billing account
4. payments
5. billing cases
6. faults

CUST-1008 and CUST-1010 similarly hard-code cross-domain call lists. S01 and S10 are shorter, but still fully application-owned.

## 2. Where does deterministic branching live?

Branching lives in TypeScript scenario functions under `phases/00-rest/src/scenarios/`. Examples:

- treat `PENDING` payment as unsettled even when a customer claims they paid;
- treat line test `PASS` + `BLOCKED` as access restriction, not physical fault;
- refuse to invent a contract end date when status is `NOT_STARTED`;
- refuse to treat a replacement order as proof that a £34.99 fee is valid.

## 3. What happens when a new combination of questions is introduced?

A new combination requires a new coded scenario (or additional controller logic). The REST resources already exist, but the *decision sequence* and safe wording are not discovered automatically. Combinatorial growth becomes expensive quickly.

## 4. What is simple and predictable about REST?

- Same inputs produce the same outputs.
- Traces show exact HTTP paths, status codes, and durations.
- Errors are explicit (`NOT_FOUND`, `INVALID_INPUT`, search ambiguity via multiple Patel matches).
- No probabilistic tool selection.

## 5. What becomes cumbersome as combinations increase?

- Every cross-domain narrative must be hand-orchestrated.
- Guardrails are duplicated across scenario files unless carefully shared.
- Supporting natural follow-up questions means more scenario code, not just more endpoints.

## Evidence captured

- Automated tests: 18 passed (`npm run rest:test`)
- Scenario runner: S01, CUST-1005, CUST-1008, CUST-1010, S10
- Live smoke: `/health`, `/customers/CUST-1005`, `/customers/search?lastName=Patel`
- Example log: `phases/00-rest/logs/run_7d4966a1-091a-4b14-b629-d98c2633f389.jsonl`

## Approval note

Phase 0 is ready for human review. Phase 1 must not start until explicitly approved after inspecting a live run and JSONL trace.
