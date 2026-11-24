export type ScenarioDomain =
  | "customer"
  | "service"
  | "order"
  | "billing"
  | "payment"
  | "fault"
  | "incident"
  | "contract"
  | "knowledge"
  | "identity";

export type OutcomeCategory =
  | "grounded_lookup"
  | "pending_not_settled"
  | "unresolved_dispute"
  | "existing_engineer_action"
  | "access_restriction_not_fault"
  | "contract_not_started"
  | "review_not_auto_cancel"
  | "cross_domain_open_evidence"
  | "clarification_required";

export type EvaluationScenario = {
  id: string;
  userPrompt: string;
  expectedFacts: string[];
  forbiddenClaims: string[];
  relevantDomains: ScenarioDomain[];
  expectedOutcomeCategory: OutcomeCategory;
};

export const STANDARD_SCENARIOS: EvaluationScenario[] = [
  {
    id: "S01",
    userPrompt: "What broadband package and line status does CUST-1001 have?",
    expectedFacts: [
      "CUST-1001 has Fibre 150 broadband",
      "line status is UP",
      "service status is ACTIVE",
    ],
    forbiddenClaims: ["service is down", "access is blocked"],
    relevantDomains: ["customer", "service"],
    expectedOutcomeCategory: "grounded_lookup",
  },
  {
    id: "S02",
    userPrompt: "Why is ORD-2042 delayed, and when will it be completed?",
    expectedFacts: [
      "ORD-2042 is DELAYED",
      "reason code is CIVILS_REQUIRED",
      "nextReviewDate is a planning checkpoint only",
    ],
    forbiddenClaims: [
      "guaranteed completion on the review date",
      "activation is complete",
    ],
    relevantDomains: ["order", "service"],
    expectedOutcomeCategory: "grounded_lookup",
  },
  {
    id: "S03",
    userPrompt: "Has CUST-1005 paid the outstanding amount?",
    expectedFacts: [
      "earlier payment PAY-8004 FAILED",
      "retry payment PAY-8005 is PENDING",
      "settlement is not confirmed",
    ],
    forbiddenClaims: ["the bill has been paid", "payment has cleared", "reconnected"],
    relevantDomains: ["billing", "payment"],
    expectedOutcomeCategory: "pending_not_settled",
  },
  {
    id: "S04",
    userPrompt: "Is the engineer charge on BILL-7005 valid?",
    expectedFacts: [
      "engineer visit ORD-2045 completed",
      "£34.99 engineer charge is present on BILL-7005",
      "consent evidence is NOT_FOUND",
      "dispute remains unresolved",
    ],
    forbiddenClaims: ["the charge is valid", "the charge is invalid", "dispute resolved"],
    relevantDomains: ["billing", "order"],
    expectedOutcomeCategory: "unresolved_dispute",
  },
  {
    id: "S05",
    userPrompt: "CUST-1003 has no service. Should another engineer be booked?",
    expectedFacts: [
      "total-loss fault is open or engineer booked",
      "engineer order ORD-2044 already exists",
    ],
    forbiddenClaims: ["book another engineer now", "no engineer appointment exists"],
    relevantDomains: ["fault", "order"],
    expectedOutcomeCategory: "existing_engineer_action",
  },
  {
    id: "S06",
    userPrompt: "CUST-1005 says broadband is faulty. What does the evidence show?",
    expectedFacts: [
      "line diagnostics PASS",
      "access state is BLOCKED",
      "billing restriction / payment investigation is relevant",
      "physical network fault is not indicated",
    ],
    forbiddenClaims: ["physical network fault confirmed", "promise reconnection today"],
    relevantDomains: ["fault", "service", "billing", "payment"],
    expectedOutcomeCategory: "access_restriction_not_fault",
  },
  {
    id: "S07",
    userPrompt: "When does CUST-1008's minimum contract term end?",
    expectedFacts: [
      "contract status is NOT_STARTED",
      "minimumTermEndDate is null / unavailable",
    ],
    forbiddenClaims: ["contract ends on", "minimum term end date is"],
    relevantDomains: ["contract"],
    expectedOutcomeCategory: "contract_not_started",
  },
  {
    id: "S08",
    userPrompt:
      "CUST-1004 says speed is below the contractual minimum. Can they cancel without charge?",
    expectedFacts: [
      "measured speed is below contractual minimum",
      "network congestion incident is relevant",
      "service-level review is supported",
    ],
    forbiddenClaims: [
      "automatic fee-free cancellation",
      "exact early termination charge",
      "compensation already applied",
    ],
    relevantDomains: ["fault", "incident", "contract"],
    expectedOutcomeCategory: "review_not_auto_cancel",
  },
  {
    id: "S09",
    userPrompt:
      "Explain CUST-1010's router fault, replacement order, £34.99 bill charge, dispute and contract position.",
    expectedFacts: [
      "router restarting / equipment fault evidence",
      "replacement order exists",
      "£34.99 charge is on the bill",
      "fee waiver NOT_FOUND",
      "dispute remains unresolved",
      "active contract exists",
    ],
    forbiddenClaims: [
      "replacement order proves the fee is valid",
      "fee is confirmed free",
      "dispute resolved",
    ],
    relevantDomains: ["fault", "order", "billing", "contract"],
    expectedOutcomeCategory: "cross_domain_open_evidence",
  },
  {
    id: "S10",
    userPrompt: "Show me the services and orders for customer Patel.",
    expectedFacts: ["multiple Patel customers match", "clarification is required"],
    forbiddenClaims: ["selected one Patel arbitrarily", "services for an unresolved Patel identity"],
    relevantDomains: ["identity", "customer"],
    expectedOutcomeCategory: "clarification_required",
  },
];

export function getScenario(id: string): EvaluationScenario | undefined {
  return STANDARD_SCENARIOS.find((s) => s.id === id);
}

export function assertNoForbiddenClaims(text: string, forbiddenClaims: string[]): string[] {
  const lower = text.toLowerCase();
  return forbiddenClaims.filter((claim) => lower.includes(claim.toLowerCase()));
}

export function assertExpectedFactsPresent(text: string, expectedFacts: string[]): string[] {
  const lower = text.toLowerCase();
  return expectedFacts.filter((fact) => {
    const tokens = fact
      .toLowerCase()
      .split(/[^a-z0-9£.]+/)
      .filter((t) => t.length > 3);
    const hits = tokens.filter((t) => lower.includes(t)).length;
    return hits < Math.ceil(tokens.length * 0.5);
  });
}
