import { z } from "zod";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { ToolDefinition } from "@northstar/model-client";

export type ToolKind = "read" | "write-like";

export type AgentTool = {
  name: string;
  description: string;
  kind: ToolKind;
  inputSchema: z.ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  execute: (args: unknown, caps: CapabilitySet) => Promise<unknown>;
};

function objectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

export function createToolRegistry(): AgentTool[] {
  return [
    {
      name: "findCustomer",
      description:
        "Find customers by customerId, or by firstName/lastName. If multiple people match a name, return them all and ask for clarification before disclosing account details.",
      kind: "read",
      inputSchema: z
        .object({
          customerId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .refine((v) => Boolean(v.customerId || v.firstName || v.lastName), {
          message: "Provide customerId and/or name fields",
        }),
      jsonSchema: objectSchema({
        customerId: { type: "string", description: "Exact id like CUST-1005" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      }),
      execute: async (args, caps) => {
        const input = args as { customerId?: string; firstName?: string; lastName?: string };
        if (input.customerId) return caps.getCustomer(input.customerId);
        return caps.findCustomersByName({
          firstName: input.firstName,
          lastName: input.lastName,
        });
      },
    },
    {
      name: "getCustomerServices",
      description: "List services for a known customerId.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getCustomerServices((args as { customerId: string }).customerId),
    },
    {
      name: "getCustomerOrders",
      description: "List orders for a known customerId.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getCustomerOrders((args as { customerId: string }).customerId),
    },
    {
      name: "getBillingAccount",
      description: "Get the billing account for a customerId. Balance here is authoritative.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getBillingAccount((args as { customerId: string }).customerId),
    },
    {
      name: "getBills",
      description: "List bills for a billingAccountId. PENDING_GENERATION bills may have null totals.",
      kind: "read",
      inputSchema: z.object({ billingAccountId: z.string() }),
      jsonSchema: objectSchema({ billingAccountId: { type: "string" } }, ["billingAccountId"]),
      execute: async (args, caps) =>
        caps.getBills((args as { billingAccountId: string }).billingAccountId),
    },
    {
      name: "getPayments",
      description:
        "List payments for a billingAccountId. SETTLED proves payment; PENDING/SCHEDULED/FAILED do not.",
      kind: "read",
      inputSchema: z.object({ billingAccountId: z.string() }),
      jsonSchema: objectSchema({ billingAccountId: { type: "string" } }, ["billingAccountId"]),
      execute: async (args, caps) =>
        caps.getPayments((args as { billingAccountId: string }).billingAccountId),
    },
    {
      name: "getBillingCases",
      description: "List billing investigation/dispute cases for a customerId.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getBillingCases((args as { customerId: string }).customerId),
    },
    {
      name: "getFaults",
      description: "List faults/diagnostics for a customerId.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getFaults((args as { customerId: string }).customerId),
    },
    {
      name: "getNetworkIncidents",
      description: "List shared network incidents that may affect services.",
      kind: "read",
      inputSchema: z.object({}).strict(),
      jsonSchema: objectSchema({}),
      execute: async (_args, caps) => caps.getNetworkIncidents(),
    },
    {
      name: "getContracts",
      description: "List contracts for a customerId. NOT_STARTED contracts have no minimum-term end date.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getContracts((args as { customerId: string }).customerId),
    },
    {
      name: "getContractEvents",
      description: "List contract events for a contractId.",
      kind: "read",
      inputSchema: z.object({ contractId: z.string() }),
      jsonSchema: objectSchema({ contractId: { type: "string" } }, ["contractId"]),
      execute: async (args, caps) =>
        caps.getContractEvents((args as { contractId: string }).contractId),
    },
    {
      name: "getOffers",
      description: "List available offers for a customerId. An available offer is not an accepted contract.",
      kind: "read",
      inputSchema: z.object({ customerId: z.string() }),
      jsonSchema: objectSchema({ customerId: { type: "string" } }, ["customerId"]),
      execute: async (args, caps) => caps.getOffers((args as { customerId: string }).customerId),
    },
    {
      name: "searchKnowledge",
      description: "Search Northstar decisioning knowledge articles.",
      kind: "read",
      inputSchema: z.object({ query: z.string(), limit: z.number().int().positive().optional() }),
      jsonSchema: objectSchema(
        {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1 },
        },
        ["query"],
      ),
      execute: async (args, caps) => {
        const input = args as { query: string; limit?: number };
        return caps.searchKnowledge(input.query, input.limit);
      },
    },
    {
      name: "draftSupportCase",
      description:
        "Create an in-memory support case DRAFT only. Never claim the case was submitted externally.",
      kind: "write-like",
      inputSchema: z.object({
        customerId: z.string(),
        subject: z.string(),
        summary: z.string(),
        relatedRecordIds: z.array(z.string()).optional(),
        evidenceGaps: z.array(z.string()).optional(),
      }),
      jsonSchema: objectSchema(
        {
          customerId: { type: "string" },
          subject: { type: "string" },
          summary: { type: "string" },
          relatedRecordIds: { type: "array", items: { type: "string" } },
          evidenceGaps: { type: "array", items: { type: "string" } },
        },
        ["customerId", "subject", "summary"],
      ),
      execute: async (args, caps) =>
        caps.draftSupportCase(
          args as {
            customerId: string;
            subject: string;
            summary: string;
            relatedRecordIds?: string[];
            evidenceGaps?: string[];
          },
        ),
    },
  ];
}

export function toolsAsModelDefinitions(tools: AgentTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.jsonSchema,
  }));
}

export function getToolMap(tools: AgentTool[]): Map<string, AgentTool> {
  return new Map(tools.map((t) => [t.name, t]));
}
