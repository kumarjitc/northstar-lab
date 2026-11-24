# Northstar fictional decisioning dataset v3

This dataset is **completely synthetic**. It contains no real customer, billing, network, or contract data.

## Structure

- `data/` — JSON entity fixtures
- `knowledge/` — Markdown decisioning articles with YAML frontmatter

## Identifier conventions

| Entity | Pattern |
|---|---|
| Customer | CUST-10xx |
| Service | SVC-30xx |
| Order | ORD-20xx |
| Billing account | BA-50xx |
| Bill | BILL-70xx |
| Payment | PAY-80xx |
| Billing case | BC-90xx |
| Fault | FLT-60xx |
| Incident | INC-41xx |
| Contract | CON-11xx |
| Contract event | CE-13xx |
| Offer | OFF-12xx |

## Deliberate scenarios

| ID | Customer | Trap |
|---|---|---|
| A | CUST-1005 | Failed payment + pending retry + blocked access; not a physical fault |
| B | CUST-1006 / BILL-7005 | Engineer visit occurred; consent NOT_FOUND; dispute unresolved |
| C | CUST-1004 | Below contractual speed + congestion; no automatic fee-free cancel |
| D | CUST-1008 / ORD-2042 | Delayed activation; contract NOT_STARTED; no end date |
| E | CUST-1007 | Resolved intermittent fault + evidenced £15 credit only |
| F | CUST-1002 | Resolved Wi-Fi fault + open replacement order mismatch |
| G | CUST-1010 | Restarting router + £34.99 charge + no waiver; dispute open |
| H | Patel / Maya | Ambiguous identity requires clarification |

## Example utterances

- What broadband package and line status does CUST-1001 have?
- Why is ORD-2042 delayed, and when will it be completed?
- Has CUST-1005 paid the outstanding amount?
- Is the engineer charge on BILL-7005 valid?
- CUST-1003 has no service. Should another engineer be booked?
- CUST-1005 says broadband is faulty. What does the evidence show?
- When does CUST-1008's minimum contract term end?
- CUST-1004 says speed is below the contractual minimum. Can they cancel without charge?
- Explain CUST-1010's router fault, replacement order, bill charge, dispute and contract position.
- Show me the services and orders for customer Patel.

Do not "fix" intentional conflicts such as a resolved fault with an open replacement order.
