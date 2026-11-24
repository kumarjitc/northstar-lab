import { z } from "zod";
import type { CapabilitySet } from "@northstar/capability-contracts";

/**
 * Stable MCP tool catalog for Phase 2.
 * Names/schemas stay identical across MCP_TOOL_BACKEND=direct|rest.
 * Intentionally duplicated from Phase 1 (phase isolation — do not import 01-agentic).
 */
export type ToolKind = "read" | "write-like";

export type McpToolSpec = {
  name: string;
  description: string;
  kind: ToolKind;
  inputSchema: Record<string, z.ZodTypeAny>;
  execute: (args: Record<string, unknown>, caps: CapabilitySet) => Promise<unknown>;
};

export function createToolCatalog(): McpToolSpec[] {
  return [
    {
      name: "findCustomer",
      description:
        "Find customers by customerId, or by firstName/lastName. If multiple people match a name, return them all and ask for clarification before disclosing account details.",
      kind: "read",
      inputSchema: {
        customerId: z.string().optional().describe("Exact id like CUST-1005"),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      },
      execute: async (args, caps) => {
        const customerId = typeof args.customerId === "string" ? args.customerId : undefined;
        const firstName = typeof args.firstName === "string" ? args.firstName : undefined;
        const lastName = typeof args.lastName === "string" ? args.lastName : undefined;
        if (customerId) return caps.getCustomer(customerId);
        return caps.findCustomersByName({ firstName, lastName });
      },
    },
    {
      name: "getCustomerServices",
      description: "List services for a known customerId.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getCustomerServices(String(args.customerId)),
    },
    {
      name: "getCustomerOrders",
      description: "List orders for a known customerId.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getCustomerOrders(String(args.customerId)),
    },
    {
      name: "getBillingAccount",
      description: "Get the billing account for a customerId. Balance here is authoritative.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getBillingAccount(String(args.customerId)),
    },
    {
      name: "getBills",
      description: "List bills for a billingAccountId. PENDING_GENERATION bills may have null totals.",
      kind: "read",
      inputSchema: { billingAccountId: z.string() },
      execute: async (args, caps) => caps.getBills(String(args.billingAccountId)),
    },
    {
      name: "getPayments",
      description:
        "List payments for a billingAccountId. SETTLED proves payment; PENDING/SCHEDULED/FAILED do not.",
      kind: "read",
      inputSchema: { billingAccountId: z.string() },
      execute: async (args, caps) => caps.getPayments(String(args.billingAccountId)),
    },
    {
      name: "getBillingCases",
      description: "List billing investigation/dispute cases for a customerId.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getBillingCases(String(args.customerId)),
    },
    {
      name: "getFaults",
      description: "List faults/diagnostics for a customerId.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getFaults(String(args.customerId)),
    },
    {
      name: "getNetworkIncidents",
      description: "List shared network incidents that may affect services.",
      kind: "read",
      inputSchema: {},
      execute: async (_args, caps) => caps.getNetworkIncidents(),
    },
    {
      name: "getContracts",
      description: "List contracts for a customerId. NOT_STARTED contracts have no minimum-term end date.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getContracts(String(args.customerId)),
    },
    {
      name: "getContractEvents",
      description: "List contract events for a contractId.",
      kind: "read",
      inputSchema: { contractId: z.string() },
      execute: async (args, caps) => caps.getContractEvents(String(args.contractId)),
    },
    {
      name: "getOffers",
      description: "List available offers for a customerId. An available offer is not an accepted contract.",
      kind: "read",
      inputSchema: { customerId: z.string() },
      execute: async (args, caps) => caps.getOffers(String(args.customerId)),
    },
    {
      name: "searchKnowledge",
      description: "Search Northstar decisioning knowledge articles.",
      kind: "read",
      inputSchema: {
        query: z.string(),
        limit: z.number().int().positive().optional(),
      },
      execute: async (args, caps) => {
        const query = String(args.query ?? "");
        const limit = typeof args.limit === "number" ? args.limit : undefined;
        return caps.searchKnowledge(query, limit);
      },
    },
    {
      name: "draftSupportCase",
      description:
        "Create an in-memory support case DRAFT only. Never claim the case was submitted externally.",
      kind: "write-like",
      inputSchema: {
        customerId: z.string(),
        subject: z.string(),
        summary: z.string(),
        relatedRecordIds: z.array(z.string()).optional(),
        evidenceGaps: z.array(z.string()).optional(),
      },
      execute: async (args, caps) =>
        caps.draftSupportCase({
          customerId: String(args.customerId),
          subject: String(args.subject),
          summary: String(args.summary),
          relatedRecordIds: Array.isArray(args.relatedRecordIds)
            ? args.relatedRecordIds.map(String)
            : undefined,
          evidenceGaps: Array.isArray(args.evidenceGaps)
            ? args.evidenceGaps.map(String)
            : undefined,
        }),
    },
  ];
}

export const EXPECTED_TOOL_NAMES = createToolCatalog().map((t) => t.name);
