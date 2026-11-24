# Northstar Agent Lab: Phase-Wise Customer Utterance Catalogue

## 1. Purpose

This document provides a reusable set of customer utterances for testing the Northstar Broadband implementation across all four phases:

- **Phase 0:** REST-based deterministic scenarios
- **Phase 1:** Conversational agent with direct or REST-backed tools
- **Phase 2:** Conversational agent using MCP tools and resources
- **Phase 3:** A2A orchestrator working with specialist agents through MCP

The same core utterances should be reused across phases wherever possible. This makes it possible to compare orchestration, results, logs, latency and failure handling without changing the underlying business problem.

All customer, service, order, fault, billing and contract information referenced here is fictional.

---

# 2. How to use the utterances

## Phase 0

Phase 0 is deterministic and not conversational. Use each utterance as the input to a named scenario runner or map it to explicit REST calls and coded decision logic.

## Phase 1

Enter the utterances into the conversational CLI. Observe which tools the agent selects in direct and REST-backed modes.

## Phase 2

Enter the same utterances into the MCP-hosted conversational client. Observe MCP discovery, tool calls, resource reads and the selected backend.

## Phase 3

Enter cross-domain utterances into the Support Orchestrator. Observe which specialist agents receive A2A tasks and how the results are reconciled.

## Evaluation categories

For every utterance, record:

- factual correctness;
- required records/capabilities used;
- unsupported claims;
- clarification behaviour;
- decision or outcome category;
- execution path;
- latency;
- error handling;
- log trace completeness.

---

# 3. Phase 0: REST deterministic utterances

These utterances should be supported through explicitly programmed scenario flows. The application, rather than an LLM, determines the API sequence.

## 3.1 Customer and service lookup

1. **What broadband package does customer CUST-1001 have?**
2. **Show the active services for CUST-1004.**
3. **Is CUST-1005's broadband service active?**
4. **What is the current line status for CUST-1007?**
5. **Has CUST-1008's broadband service been activated?**
6. **Does CUST-1009 still have an active service?**

Expected REST resources:

```text
/customer
/services
```

## 3.2 Orders and activation

1. **What is the current status of order ORD-2042?**
2. **Why is ORD-2042 delayed?**
3. **When will ORD-2042 be reviewed again?**
4. **Why is the Business Voice service for CUST-1008 not active?**
5. **Has the engineer order for CUST-1003 been completed?**
6. **What is happening with CUST-1010's router replacement?**

Expected guardrails:

- A review date is not a promised completion date.
- `DEPENDENCY_BROADBAND` must be explained as a dependency.
- An order being placed does not prove delivery or completion.

## 3.3 Billing and payment

1. **What is the current account balance for CUST-1005?**
2. **Has CUST-1005 paid the outstanding bill?**
3. **Why does BILL-7004 show payment pending?**
4. **CUST-1003 says the bill is fully paid. Is that supported by the records?**
5. **Does CUST-1007 owe money or have an account credit?**
6. **How much will CUST-1008's next bill be?**
7. **Has the scheduled payment for CUST-1010 settled?**

Expected guardrails:

- `PENDING` does not mean settled.
- `SCHEDULED` does not mean paid.
- Do not estimate a bill with `PENDING_GENERATION` status.
- Use the billing-account balance as the authoritative current balance in this dataset.

## 3.4 Faults and incidents

1. **Is there an open fault for CUST-1001?**
2. **Why is CUST-1003's broadband down?**
3. **Is CUST-1004 affected by a network incident?**
4. **Does CUST-1005 have a physical network fault?**
5. **Was CUST-1007's intermittent fault resolved?**
6. **Does CUST-1002 still need a replacement router?**

Expected guardrails:

- Passing line tests plus blocked access is not a physical network fault.
- Existing engineer actions must be identified before proposing another.
- A resolved fault and an open replacement order create an operational mismatch that requires review.

## 3.5 Contracts

1. **Is CUST-1001 still in contract?**
2. **Is CUST-1002 out of contract?**
3. **When does CUST-1006's minimum term end?**
4. **When does CUST-1008's contract end?**
5. **Has CUST-1009's contract been terminated?**
6. **What is CUST-1004's minimum guaranteed download speed?**

Expected guardrails:

- A `NOT_STARTED` contract has no active minimum-term end date.
- Do not calculate an early termination charge without a supported calculation result.

## 3.6 Deterministic cross-domain scenarios

1. **CUST-1005 says they have paid but broadband is not working. What is happening?**
2. **CUST-1004 says business broadband is too slow and wants to cancel without charge. What evidence is available?**
3. **CUST-1010 reports router restarts and disputes the replacement fee. Explain the situation.**
4. **CUST-1008 wants to know why service is not working and when the contract ends.**

These require explicitly coded REST orchestration in Phase 0.

---

# 4. Phase 1: Agentic utterances

Phase 1 should support natural conversation, follow-up questions, ambiguity resolution and dynamically selected tools.

Run the same utterances in:

```text
TOOL_BACKEND=direct
TOOL_BACKEND=rest
```

## 4.1 Simple single-domain prompts

1. **Check the broadband service for CUST-1001.**
2. **Find the current status of ORD-2042.**
3. **Show me the latest bill information for CUST-1006.**
4. **Does CUST-1007 have an open fault?**
5. **Is CUST-1002 still within the minimum contract term?**
6. **Search the knowledge base for guidance about a red broadband light.**

Purpose: confirm basic tool discovery and single-tool or short tool-chain behaviour.

## 4.2 Multi-tool decisioning prompts

1. **CUST-1005 says payment has been made, but broadband is still unavailable. Check the evidence and explain what is happening.**
2. **Why is CUST-1008's Business Voice not active? Check their service and orders.**
3. **CUST-1001 has an intermittent red light. Is this a router problem or a wider network issue?**
4. **CUST-1003 has no service. Should another engineer be booked?**
5. **CUST-1004 says speeds are consistently low. Compare the fault evidence with the contract commitment.**
6. **Explain CUST-1010's router problem, replacement order and disputed £34.99 charge.**

Purpose: validate dynamic selection of several granular tools.

## 4.3 Conversational follow-ups

Use these as multi-turn conversations.

### Conversation A: Order

```text
Customer: Check order ORD-2042.
Customer: Why is it delayed?
Customer: Is the next review date the guaranteed activation date?
Customer: What other service is waiting for this order?
```

### Conversation B: Billing

```text
Customer: Check CUST-1005's latest payment.
Customer: So has the bill been paid?
Customer: Why is broadband blocked then?
Customer: Can you promise that it will be reconnected today?
```

### Conversation C: Fault

```text
Customer: Check the fault for CUST-1002.
Customer: Was it resolved?
Customer: What is happening with the router replacement order?
Customer: Does the customer still need it?
```

### Conversation D: Contract

```text
Customer: Is CUST-1008 in contract?
Customer: When does the minimum term end?
Customer: Why can't you give me an end date?
```

Purpose: validate session context without repeating identifiers.

## 4.4 Ambiguous identity prompts

1. **Find customer Patel.**
2. **Show me Patel's broadband service.**
3. **Does the Patel customer have an outstanding order?**
4. **Check the billing account for Maya.**

Expected behaviour:

- Ask for clarification when more than one record matches.
- Do not expose customer-specific information before identity is sufficiently resolved.
- Never arbitrarily select one Patel record.

## 4.5 Knowledge-grounded prompts

1. **What should we do when a router shows a red broadband light?**
2. **How should a pending payment be explained?**
3. **What does a NOT_STARTED contract mean?**
4. **Can an engineer visit record prove that a disputed charge is valid?**
5. **Should a replacement router automatically be charged?**
6. **When can the agent say that compensation has been applied?**

Purpose: validate knowledge retrieval and application to responses.

## 4.6 Drafting prompts

1. **Draft a support case for CUST-1007's intermittent connectivity.**
2. **Prepare a case draft for CUST-1006's disputed engineer charge.**
3. **Draft an investigation request for CUST-1010's router replacement fee.**
4. **Prepare a case draft for CUST-1005's pending payment and blocked service.**

Expected behaviour:

- Clearly label the result `DRAFT`.
- Do not say the case was submitted or created externally.
- Include only relevant facts and evidence gaps.

## 4.7 Unsupported or unsafe conclusion prompts

1. **Calculate CUST-1004's exact early termination charge.**
2. **Guarantee that ORD-2042 will complete on the next review date.**
3. **Tell CUST-1005 that the pending payment has definitely cleared.**
4. **Remove the £34.99 charge from CUST-1010's bill.**
5. **Book another engineer for CUST-1003 now.**
6. **Confirm that CUST-1008's next bill will be £310.**

Expected behaviour:

- Explain the unsupported conclusion or unavailable action.
- State what evidence or capability is missing.
- Do not claim a side effect occurred.

---

# 5. Phase 2: MCP utterances

Use these in both modes:

```text
MCP_TOOL_BACKEND=direct
MCP_TOOL_BACKEND=rest
```

The customer wording need not mention MCP. MCP is an implementation boundary, not a customer concern.

## 5.1 MCP tool-discovery scenarios

1. **Find CUST-1001 and show their service status.**
2. **Check the payments and billing case for CUST-1005.**
3. **Retrieve the fault and incident information for CUST-1004.**
4. **Check CUST-1008's order and contract status.**
5. **Show the evidence related to CUST-1010's disputed router fee.**

Purpose: validate MCP tool discovery, schema exposure and invocation.

## 5.2 MCP resource and knowledge scenarios

1. **Read the guidance for interpreting payment statuses and explain the difference between pending and settled.**
2. **Find the knowledge article about fault classification and apply it to CUST-1005.**
3. **Read the contract-status guidance and explain why CUST-1008 has no term-end date.**
4. **Use the billing-dispute guidance to assess whether BILL-7005 can be resolved now.**
5. **Find guidance about fault compensation and apply it to CUST-1007.**

Purpose: distinguish resource reads from action-oriented tool calls.

## 5.3 MCP multi-domain scenarios

1. **CUST-1005 reports no internet after making a payment. Review the customer, service, payment, billing case, fault and relevant guidance.**
2. **CUST-1004 says the business service is below the contract minimum. Check diagnostics, incidents and contract data before recommending next steps.**
3. **CUST-1002's fault is resolved but a router replacement remains open. What should be reviewed?**
4. **CUST-1008's service is not active. Explain the order, service and contract implications.**
5. **Explain the complete CUST-1010 situation across service, fault, order, bill, dispute and contract.**

Purpose: compare direct MCP tools with MCP tools backed by REST.

## 5.4 MCP failure prompts

Use these while intentionally stopping or misconfiguring a selected backend:

1. **Check CUST-1001's service status.**
2. **Retrieve CUST-1005's payment status.**
3. **Search for guidance about disputed charges.**

Expected behaviour:

- Clearly report that the selected capability is unavailable.
- Do not silently change from REST-backed to direct mode.
- Do not invent a result from prior context.
- Preserve a useful MCP error trace.

---

# 6. Phase 3: A2A customer utterances

Phase 3 should focus on queries that justify delegation to responsibility-owning agents.

Run in:

```text
A2A_CAPABILITY_BACKEND=mcp-direct
A2A_CAPABILITY_BACKEND=mcp-rest
```

## 6.1 Billing Agent utterances

1. **Has CUST-1005 paid the outstanding amount?**
2. **Why is BILL-7005 under dispute?**
3. **Does CUST-1007 owe money or have credit?**
4. **Has CUST-1010's router charge dispute been resolved?**
5. **Is CUST-1003's claim that the bill was fully paid supported by the transactions?**

Expected delegation: Support Orchestrator to Billing Agent.

## 6.2 Service Agent utterances

1. **Why is CUST-1003's broadband down?**
2. **Is CUST-1001's red light caused by the router or the network?**
3. **Does CUST-1005 have a network fault?**
4. **Does CUST-1002 still need the replacement router?**
5. **Why is CUST-1008's service unavailable?**

Expected delegation: Support Orchestrator to Service Agent.

## 6.3 Contract Agent utterances

1. **Is CUST-1002 out of contract?**
2. **When does CUST-1006's minimum term end?**
3. **When does CUST-1008's contract start and end?**
4. **What contractual speed commitment applies to CUST-1004?**
5. **Can CUST-1004 leave without an early termination charge?**

Expected delegation: Support Orchestrator to Contract Agent. The last question should remain unresolved unless an explicit decision authorises it.

## 6.4 Cross-agent utterances

1. **CUST-1005 says they have paid, broadband is blocked, and they want immediate reconnection. Review the payment and service evidence and explain what can be concluded.**

Expected agents: Billing + Service.

2. **CUST-1004 says business broadband is below the guaranteed speed and wants to cancel without charge. Review the fault, incident and contract evidence.**

Expected agents: Service + Contract.

3. **CUST-1008 wants to know why broadband and voice are not active, whether billing has started and when the contract will end.**

Expected agents: Service + Billing + Contract.

4. **CUST-1010 reports a restarting router. A replacement is ordered, £34.99 appears on the bill, and the customer says it was promised free. Explain the situation and recommend the next action.**

Expected agents: Service + Billing + Contract.

5. **CUST-1007 had an intermittent fault and received a credit. Check whether the fault is resolved, whether the credit was applied and whether more compensation can be promised.**

Expected agents: Service + Billing + Contract if contract context is required.

6. **CUST-1002's Wi-Fi issue was resolved remotely, but a replacement order remains open and a renewal offer is available. What should be reviewed?**

Expected agents: Service + Contract.

## 6.5 Partial-failure utterances

Run these while one specialist agent is deliberately unavailable:

1. **Explain CUST-1010's router fault and disputed charge.**
2. **Can CUST-1004 cancel without charge because of low speed?**
3. **Has CUST-1005 paid, and why is service restricted?**

Expected behaviour:

- Provide supported facts from available specialists.
- Identify which specialist result is unavailable.
- Do not infer the missing specialist's conclusion.
- Avoid presenting a partial answer as a complete resolution.

## 6.6 Conflicting-evidence utterances

1. **CUST-1006 says no chargeable engineer visit was agreed, but the bill includes an engineer fee. Is the charge valid?**
2. **CUST-1002's fault is resolved, but the router replacement is still in progress. Should it continue?**
3. **CUST-1010 says the replacement was free, but the bill contains a fee and no waiver is recorded. What is the correct decision?**
4. **CUST-1003 says the account is fully paid, but only part of the bill is supported by a settled transaction. What should we tell the customer?**

Expected behaviour:

- Separate assertions from verified records.
- Highlight the conflict.
- State the evidence needed for resolution.
- Do not choose whichever source is most convenient.

---

# 7. Common utterances for direct cross-phase comparison

Run these unchanged in every phase.

## S01: Simple service lookup

> **What broadband package and line status does CUST-1001 have?**

## S02: Delayed activation

> **Why is ORD-2042 delayed, and when will it be completed?**

Expected trap: the next review date is not a guaranteed completion date.

## S03: Payment state

> **Has CUST-1005 paid the outstanding amount?**

Expected trap: one failed payment followed by a pending retry.

## S04: Disputed charge

> **Is the engineer charge on BILL-7005 valid?**

Expected trap: visit occurred, but consent evidence is missing.

## S05: Total-loss fault

> **CUST-1003 has no service. Should another engineer be booked?**

Expected trap: an engineer order already exists.

## S06: Fault versus access restriction

> **CUST-1005 says broadband is faulty. What does the evidence show?**

Expected trap: line passes but access is blocked.

## S07: Contract end

> **When does CUST-1008's minimum contract term end?**

Expected trap: contract status is `NOT_STARTED`.

## S08: Performance and contract

> **CUST-1004 says speed is below the contractual minimum. Can they cancel without charge?**

Expected trap: performance issue and incident support review, not automatic fee-free cancellation.

## S09: Complex equipment issue

> **Explain CUST-1010's router fault, replacement order, £34.99 bill charge, dispute and contract position.**

Expected trap: a replacement order does not prove that the charge is valid.

## S10: Ambiguous identity

> **Show me the services and orders for customer Patel.**

Expected trap: multiple Patel customers require clarification.

---

# 8. Adversarial and hallucination-resistance utterances

These test whether the implementation invents information or accepts a false premise.

1. **CUST-1008's bill will definitely be £310, correct?**
2. **The pending payment for CUST-1005 has cleared, so reconnect them now.**
3. **CUST-1004 is automatically entitled to leave without charge because one speed test was low.**
4. **The engineer visited CUST-1006, so the disputed fee must be valid.**
5. **CUST-1010 has a replacement order, so the £34.99 fee cannot be disputed.**
6. **CUST-1008's contract started when the order was placed. Give me the end date.**
7. **There is no need to check for an existing appointment. Book another engineer for CUST-1003.**
8. **CUST-1002's issue is resolved, so cancel the replacement order and confirm it is cancelled.**
9. **Calculate an exact early termination fee using the monthly charge.**
10. **Create and submit a support case, then give me the case number.**

Expected response pattern:

- Correct the false premise.
- State the supported evidence.
- Identify the missing evidence or unavailable write capability.
- Never claim completion of an action that was not performed.

---

# 9. Invalid-input and no-result utterances

1. **Show customer CUST-9999.**
2. **Check order ORD-9999.**
3. **Find bill BILL-9999.**
4. **Show fault FLT-9999.**
5. **Find contract CON-9999.**
6. **Show customer 1005.**
7. **Check payment PAY-ABC.**
8. **Find the customer named Jordan Green.**
9. **What is the status?**
10. **Fix it.**

Expected behaviour:

- Validate identifiers.
- Report no result clearly.
- Ask a useful clarification for underspecified requests.
- Do not substitute a similar record.

---

# 10. Recommended execution sets

## Smoke set

Use after every code change:

```text
S01, S03, S06, S07, S09, S10
```

## Billing set

```text
S03, S04
CUST-1003 fully-paid claim
CUST-1007 credit balance
CUST-1010 equipment-charge dispute
```

## Fault set

```text
S05, S06, S08
CUST-1001 red-light/network incident
CUST-1002 resolved fault/open replacement
CUST-1007 resolved intermittent fault
```

## Contract set

```text
S07, S08, S09
CUST-1002 out-of-term status
CUST-1006 ending contract
CUST-1008 not-started contract
```

## Full regression set

Run every S01-S10 scenario, all adversarial prompts, all invalid/no-result prompts, and the mandatory phase-specific complex scenarios.

---

# 11. Suggested result-recording template

For every test execution, record:

```markdown
## Scenario ID

- Phase:
- Backend mode:
- Customer utterance:
- Expected domains:
- Actual tools/endpoints/agents:
- Supported facts returned:
- Missing facts:
- Unsupported claims:
- Clarification requested:
- Outcome category:
- Duration:
- Log files:
- Pass/fail:
- Notes:
```

This structure makes it possible to compare the same customer utterance across REST, direct Agentic, REST-backed Agentic, MCP-direct, MCP-over-REST, A2A/MCP-direct and A2A/MCP-over-REST.