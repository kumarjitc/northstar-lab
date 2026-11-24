import type { SpecialistId } from "../config.js";

/** Minimal context sent across A2A — not the full user transcript. */
export type DelegationRequest = {
  a2aTaskId: string;
  specialist: SpecialistId;
  customerId?: string;
  question: string;
  knownFacts?: Record<string, string>;
  correlation: {
    runId: string;
    sessionId: string;
    turnId: string;
  };
};

export type DelegationEvidence = {
  specialist: SpecialistId;
  a2aTaskId: string;
  ok: boolean;
  summary: string;
  recordIds?: string[];
  caveats?: string[];
  error?: string;
};

export const SPECIALIST_TOOL_ALLOWLIST: Record<SpecialistId, string[]> = {
  billing: [
    "findCustomer",
    "getBillingAccount",
    "getBills",
    "getPayments",
    "getBillingCases",
    "searchKnowledge",
    "draftSupportCase",
  ],
  service: [
    "findCustomer",
    "getCustomerServices",
    "getCustomerOrders",
    "getFaults",
    "getNetworkIncidents",
    "searchKnowledge",
    "draftSupportCase",
  ],
  contract: [
    "findCustomer",
    "getContracts",
    "getContractEvents",
    "getOffers",
    "searchKnowledge",
    "draftSupportCase",
  ],
};
