You are creating a synthetic dataset and knowledge base for a Node.js
learning project called "Northstar Agent Lab".

IMPORTANT:
- Everything must be completely fictional.
- Do not use real customer information.
- Do not retrieve or copy enterprise data.
- Do not implement application code, agents, MCP or A2A.
- Your task is ONLY to generate the synthetic data and knowledge package.

PURPOSE

The dataset will be used to compare four architectures:

Phase 0 - deterministic REST
Phase 1 - conversational Agentic implementation
Phase 2 - Agentic + MCP
Phase 3 - Multi-agent A2A + MCP

The data must deliberately contain ambiguity, dependencies, incomplete
evidence and conflicting operational states so that an agent must reason
across multiple sources rather than simply perform a lookup.

============================================================
1. OUTPUT STRUCTURE
============================================================

Create:

northstar_fictional_decisioning_dataset_v3/
|
+-- README.md
|
+-- data/
| +-- customers.json
| +-- services.json
| +-- orders.json
| +-- billing-accounts.json
| +-- bills.json
| +-- payments.json
| +-- billing-cases.json
| +-- faults.json
| +-- network-incidents.json
| +-- contracts.json
| +-- contract-events.json
| +-- offers.json
|
+-- knowledge/
+-- billing-decisioning.md
+-- payment-status.md
+-- billing-disputes.md
+-- fault-decisioning.md
+-- fault-compensation.md
+-- contract-status.md
+-- cross-domain-decisioning.md
+-- orders-and-activation.md

When complete, also generate:

northstar_fictional_decisioning_dataset_v3.zip

============================================================
2. DATA VOLUME
============================================================

Generate approximately:

- 10 customers
- 10-15 services
- 7-12 orders
- 10 billing accounts
- 6-10 bills
- 5-10 payments
- 4-8 billing cases
- 8-12 faults
- 2-5 network incidents
- 10 contracts
- 5-10 contract events
- 2-5 offers
- 8+ knowledge articles

Keep the dataset small enough for a developer to inspect manually.

============================================================
3. IDENTIFIER CONVENTION
============================================================

Use stable fictional identifiers similar to:

Customers:
CUST-1001

Services:
SVC-3001

Orders:
ORD-2042

Billing accounts:
BA-5001

Bills:
BILL-7001

Payments:
PAY-8001

Billing cases:
BC-9001

Faults:
FLT-6001

Network incidents:
INC-4101

Contracts:
CON-1101

Contract events:
CE-1301

Offers:
OFF-1201

IDs must link correctly across files.

============================================================
4. CUSTOMER DESIGN
============================================================

Create fictional customers including both:

- Consumer
- Small Business

Customer states should include:

ACTIVE
SUSPENDED
CLOSED

Deliberately create at least two customers with the same surname
(for example Patel).

This is important because:

"Find customer Patel"

must return an ambiguous result rather than automatically choosing one
customer.

Use @example.test email addresses only.

============================================================
5. SERVICE DATA
============================================================

Create broadband and related services such as:

Fibre 50
Fibre 150
Fibre 500
Business Fibre 500
Business Fibre 900
Digital Voice
Whole Home WiFi
Static IP

Include states:

ACTIVE
PROVISIONING
SUSPENDED
CEASED

Include line states:

UP
DOWN
DEGRADED
BLOCKED
NOT_ACTIVATED
CEASED

Where relevant include:

downloadMbps
router model
access technology

The service state and network line state must not always mean the same
thing.

============================================================
6. ORDER DATA
============================================================

Include order types such as:

NEW_SERVICE
UPGRADE
ROUTER_REPLACEMENT
FAULT_VISIT
RECONNECT
VOICE_ADD
ADD_ON
CEASE

Statuses should include:

PLACED
IN_PROGRESS
DELAYED
COMPLETED
CANCELLED

Use reason codes such as:

CIVILS_REQUIRED
DEPENDENCY_BROADBAND
PAYMENT_REVIEW
CUSTOMER_CANCELLED
DUPLICATE_ORDER

Important:

A review date must NOT be represented as a guaranteed completion date.

Include at least one situation where:

fault resolved
+
router replacement order still open

This conflict must require review.

============================================================
7. BILLING ACCOUNTS
============================================================

Create billing accounts linked to customers.

Include:

billingAccountId
customerId
balance
currency
accountStatus
paymentMethod
autopayStatus

Account states should include:

CURRENT
RESTRICTED
CLOSED

Balances must include examples of:

positive outstanding balance
zero balance
negative/credit balance

============================================================
8. BILLS
============================================================

Bills must contain itemised charges.

Examples:

RECURRING
ONE_OFF
LATE_FEE
SERVICE_CREDIT

Statuses should include:

ISSUED
PARTIALLY_PAID
PAYMENT_PENDING
UNDER_DISPUTE
CREDIT
PENDING_GENERATION
PAID

At least one PENDING_GENERATION bill must have:

total = null

The agent must NOT be able to calculate or estimate its final amount.

Create at least one bill containing a disputed router replacement charge.

Create at least one bill containing a disputed engineer charge.

============================================================
9. PAYMENTS
============================================================

Include payment statuses:

SETTLED
FAILED
PENDING
SCHEDULED

Create at least this deliberate sequence:

Payment A:
FAILED

followed by

Payment B:
PENDING

for the same billing account.

This tests whether the agent incorrectly says:

"The customer has paid."

Correct answer:

A payment attempt failed and a replacement payment is still pending;
settlement is not confirmed.

============================================================
10. BILLING CASES
============================================================

Create cases including:

CHARGE_DISPUTE
PAYMENT_INVESTIGATION
CREDIT_QUERY
EQUIPMENT_CHARGE_DISPUTE
PARTIAL_PAYMENT_QUERY

Case states:

OPEN
INVESTIGATING
PENDING_EXTERNAL
AWAITING_EVIDENCE
RESOLVED

Provide evidence arrays.

Create a case where:

Engineer visit occurred
+
customer disputes charge
+
consent evidence is NOT_FOUND

The agent must NOT infer that the charge is valid simply because the
engineer attended.

Create another where:

Replacement router order exists
+
bill contains replacement fee
+
customer says replacement was promised free
+
fee waiver record is NOT_FOUND

Outcome must remain unresolved.

============================================================
11. FAULT DATA
============================================================

Create faults covering:

CONNECTIVITY
TOTAL_LOSS
PERFORMANCE
ACCESS_RESTRICTION
INTERMITTENT
PRE_ACTIVATION
EQUIPMENT

Statuses:

OPEN
ENGINEER_BOOKED
MONITORING
RESOLVED
RESOLVED_MONITORING
CLOSED_NO_FAULT

Diagnostics should contain combinations of:

lineTest PASS/FAIL
opticalPower
routerReachable
routerRestartCount24h
measuredDownloadMbps
contractMinimumMbps
congestionDetected
accessState

Do NOT make every "no internet" complaint a network fault.

============================================================
12. NETWORK INCIDENTS
============================================================

Create shared network incidents.

At minimum include:

1. congestion affecting a Business customer;
2. DNS/resolver degradation where line tests remain healthy.

This must allow the following scenario:

Customer reports intermittent browsing
+
line test PASS
+
router reachable
+
network DNS incident active

The correct agent behaviour is to consider the active incident rather
than immediately diagnosing router failure.

============================================================
13. CONTRACTS
============================================================

Create contracts with:

contractId
customerId
serviceId
status
minimumTermEndDate
monthlyRecurringCharge
minimumGuaranteedDownloadMbps
earlyTerminationPolicyId

Statuses:

IN_TERM
OUT_OF_TERM
ENDING
NOT_STARTED
IN_TERM_RESTRICTED
TERMINATED

Important:

For at least one delayed activation:

contract.status = NOT_STARTED
minimumTermEndDate = null
activationTrigger = SERVICE_ACTIVATION

The agent must not invent a contract end date.

Include consumer and business contracts.

The dataset must NOT contain enough information to calculate an exact
early termination charge.

============================================================
14. CONTRACT EVENTS
============================================================

Create events such as:

UPGRADE_ACCEPTED
MINIMUM_TERM_ENDED
SERVICE_LEVEL_REVIEW_OPENED
SERVICE_RESTRICTED
RENEWAL_OFFER_CREATED
FAULT_CREDIT_APPLIED
ACTIVATION_DELAYED
EQUIPMENT_REPLACEMENT_ORDERED

Link events to relevant:

faults
orders
billing cases
bills

============================================================
15. OFFERS
============================================================

Create several renewal/upgrade offers.

The data must clearly distinguish:

AVAILABLE OFFER

from

ACCEPTED CONTRACT

The agent must never represent an available offer as accepted.

============================================================
16. REQUIRED COMPLEX SCENARIOS
============================================================

Design the dataset so ALL of these situations exist.

SCENARIO A - PAYMENT + RESTRICTED SERVICE

Customer:
- broadband unavailable
- line diagnostics PASS
- service access BLOCKED
- previous payment FAILED
- replacement payment PENDING
- billing investigation PENDING

Correct reasoning:

Payment settlement not confirmed.
Physical network fault not indicated.
Do not promise reconnection.

SCENARIO B - DISPUTED ENGINEER CHARGE

Customer:
- engineer visit occurred
- bill contains engineer charge
- customer disputes consent
- consent evidence NOT_FOUND
- billing case INVESTIGATING

Correct reasoning:

Visit occurrence does not prove that the charge was agreed.
Outcome remains unresolved.

SCENARIO C - BUSINESS PERFORMANCE

Customer:
- Business broadband
- actual measured speed below contractual guaranteed minimum
- active congestion incident
- service-level review open

Correct reasoning:

Evidence supports further service-level review.
Do NOT automatically promise compensation or fee-free cancellation.

SCENARIO D - DELAYED ACTIVATION

Customer:
- broadband PROVISIONING
- line NOT_ACTIVATED
- order DELAYED
- CIVILS_REQUIRED
- voice service depends on broadband
- contract NOT_STARTED

Correct reasoning:

This is primarily an activation/order issue.
Contract term has not started.
No contract end date should be invented.

SCENARIO E - RESOLVED FAULT + CREDIT

Customer:
- intermittent fault resolved
- explicit fault credit applied
- account now has a credit balance

Correct reasoning:

Agent can report the evidenced credit.
It cannot automatically promise additional compensation.

SCENARIO F - RESOLVED FAULT + OPEN EQUIPMENT ORDER

Customer:
- equipment/WiFi issue resolved remotely
- router replacement order remains IN_PROGRESS

Correct reasoning:

Identify operational mismatch.
Do not automatically cancel the order.
Recommend review.

SCENARIO G - ROUTER FEE DISPUTE

Customer:
- router repeatedly restarting
- replacement order exists
- bill contains replacement charge
- customer says replacement was free
- no fee-waiver evidence
- dispute case open
- active contract exists

Correct reasoning:

Replacement order does not prove the fee is valid.
Customer statement does not prove the fee is invalid.
Keep decision unresolved pending evidence.

SCENARIO H - AMBIGUOUS IDENTITY

At least two customers share surname Patel.

Correct response:

Ask for an additional identifier.

============================================================
17. KNOWLEDGE BASE
============================================================

Create Markdown knowledge articles with frontmatter:

---
articleId:
title:
category:
lastReviewed:
---

Each article should contain practical decisioning guidance rather than
simply repeating the JSON data.

Required subjects:

Billing decisioning
Payment status
Billing disputes
Fault decisioning
Fault compensation
Contract status
Cross-domain decisioning
Orders and activation

Rules that MUST appear somewhere in the knowledge:

1. SETTLED proves payment received.
2. PENDING does NOT prove payment received.
3. SCHEDULED does NOT prove payment received.
4. A failed payment remains failed even when a retry is pending.
5. A bill charge proves the charge was raised, not that it is valid.
6. Customer assertions are evidence but not proof.
7. Missing required consent means the dispute remains unresolved.
8. A fault does not automatically cancel a contract.
9. An open dispute does not automatically suspend a contract term.
10. NOT_STARTED contracts have no active minimum-term end date.
11. A billing/access restriction is not automatically a network fault.
12. Pre-activation complaints should normally be evaluated against
provisioning/orders before network faults.
13. Existing engineer appointments must be checked before dispatching
another engineer.
14. A resolved fault does not automatically mean compensation is due.
15. Only explicit credit records may be reported as applied credits.
16. Do not calculate unsupported early termination charges.
17. An offer is not an accepted contract.
18. A review date is not a promised completion date.
19. A support-case draft is not a submitted case.
20. Conflicting evidence should be reported, not silently resolved.

============================================================
18. DATA QUALITY REQUIREMENTS
============================================================

Before packaging, validate:

1. Every JSON file parses.
2. IDs are unique within entity types.
3. Every foreign key references an existing record.
4. Customer-to-service links are valid.
5. Order customer references are valid.
6. Billing account/customer relationships are valid.
7. Bills reference valid billing accounts.
8. Payments reference valid accounts/bills.
9. Billing cases reference valid customers/bills.
10. Faults reference valid services/customers.
11. Fault appointment IDs reference valid orders where present.
12. Incident links reference valid services where present.
13. Contracts reference valid customers/services.
14. Contract events reference valid contracts.
15. Cross-domain scenarios are internally coherent.
16. Deliberate business ambiguity is preserved.

Do not "fix" deliberate business conflicts such as:

fault resolved + replacement order still open.

They are intentionally included for agent decisioning.

============================================================
19. README
============================================================

Generate a README explaining:

- data is completely synthetic;
- file structure;
- identifier conventions;
- each deliberately complex scenario;
- expected reasoning traps;
- example customer utterances.

Include at least these prompts:

"What broadband package and line status does CUST-1001 have?"

"Why is ORD-2042 delayed, and when will it be completed?"

"Has CUST-1005 paid the outstanding amount?"

"Is the engineer charge on BILL-7005 valid?"

"CUST-1003 has no service. Should another engineer be booked?"

"CUST-1005 says broadband is faulty. What does the evidence show?"

"When does CUST-1008's minimum contract term end?"

"CUST-1004 says speed is below the contractual minimum. Can they
cancel without charge?"

"Explain CUST-1010's router fault, replacement order, bill charge,
dispute and contract position."

"Show me the services and orders for customer Patel."

============================================================
20. FINAL OUTPUT
============================================================

Do not just display the generated data in the chat.

Create the actual directory and files.

Validate all JSON programmatically.

Generate:

northstar_fictional_decisioning_dataset_v3.zip

At completion report:

- files created;
- record count per JSON file;
- knowledge articles created;
- validation results;
- deliberate decisioning scenarios;
- ZIP file location;
- any deviations from this specification.

Do not implement the Northstar application itself.

STOP after generating and validating the dataset.