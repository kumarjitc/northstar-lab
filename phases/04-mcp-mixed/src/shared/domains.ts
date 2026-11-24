import { z } from "zod";
import type { CapabilitySet } from "@northstar/capability-contracts";

export type MixedTransport = "mcp" | "a2a" | "rest";

export type FacadeToolSpec = {
  name: string;
  description: string;
  transport: MixedTransport;
  inputSchema: Record<string, z.ZodTypeAny>;
  /** Used for contract REST tools only. */
  executeRest?: (args: Record<string, unknown>, caps: CapabilitySet) => Promise<unknown>;
};

/** Billing tools — fulfilled by proxying to a real MCP child server. */
export const BILLING_TOOL_NAMES = [
  "findCustomer",
  "getBillingAccount",
  "getBills",
  "getPayments",
  "getBillingCases",
  "searchKnowledge",
  "draftSupportCase",
] as const;

/** Contract tools — fulfilled via REST CapabilitySet. */
export const CONTRACT_TOOL_NAMES = [
  "getContracts",
  "getContractEvents",
  "getOffers",
] as const;

export const SERVICE_AGENT_TOOL = "ask_service_agent";

export function createBillingToolSpecs(): FacadeToolSpec[] {
  return [
    {
      name: "findCustomer",
      description:
        "[billing/MCP] Find customers by customerId or name. Clarify ambiguous name matches.",
      transport: "mcp",
      inputSchema: {
        customerId: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      },
    },
    {
      name: "getBillingAccount",
      description: "[billing/MCP] Billing account for a customerId. Balance is authoritative.",
      transport: "mcp",
      inputSchema: { customerId: z.string() },
    },
    {
      name: "getBills",
      description: "[billing/MCP] Bills for a billingAccountId.",
      transport: "mcp",
      inputSchema: { billingAccountId: z.string() },
    },
    {
      name: "getPayments",
      description: "[billing/MCP] Payments for a billingAccountId. SETTLED proves payment.",
      transport: "mcp",
      inputSchema: { billingAccountId: z.string() },
    },
    {
      name: "getBillingCases",
      description: "[billing/MCP] Billing cases/disputes for a customerId.",
      transport: "mcp",
      inputSchema: { customerId: z.string() },
    },
    {
      name: "searchKnowledge",
      description: "[billing/MCP] Search Northstar knowledge articles.",
      transport: "mcp",
      inputSchema: {
        query: z.string(),
        limit: z.number().int().positive().optional(),
      },
    },
    {
      name: "draftSupportCase",
      description: "[billing/MCP] Create an in-memory support case DRAFT only.",
      transport: "mcp",
      inputSchema: {
        customerId: z.string(),
        subject: z.string(),
        summary: z.string(),
        relatedRecordIds: z.array(z.string()).optional(),
        evidenceGaps: z.array(z.string()).optional(),
      },
    },
  ];
}

export function createServiceToolSpecs(): FacadeToolSpec[] {
  return [
    {
      name: SERVICE_AGENT_TOOL,
      description:
        "[service/A2A] Ask the Service specialist agent about services, faults, incidents, or orders. " +
        "Pass a focused question and optional customerId. The agent uses its own direct tools.",
      transport: "a2a",
      inputSchema: {
        question: z.string(),
        customerId: z.string().optional(),
      },
    },
  ];
}

export function createContractToolSpecs(): FacadeToolSpec[] {
  return [
    {
      name: "getContracts",
      description: "[contract/REST] Contracts for a customerId (Phase 0 HTTP).",
      transport: "rest",
      inputSchema: { customerId: z.string() },
      executeRest: async (args, caps) => caps.getContracts(String(args.customerId)),
    },
    {
      name: "getContractEvents",
      description: "[contract/REST] Contract events for a contractId (Phase 0 HTTP).",
      transport: "rest",
      inputSchema: { contractId: z.string() },
      executeRest: async (args, caps) => caps.getContractEvents(String(args.contractId)),
    },
    {
      name: "getOffers",
      description: "[contract/REST] Offers for a customerId (Phase 0 HTTP).",
      transport: "rest",
      inputSchema: { customerId: z.string() },
      executeRest: async (args, caps) => caps.getOffers(String(args.customerId)),
    },
  ];
}

export function createFacadeCatalog(): FacadeToolSpec[] {
  return [
    ...createBillingToolSpecs(),
    ...createServiceToolSpecs(),
    ...createContractToolSpecs(),
  ];
}
