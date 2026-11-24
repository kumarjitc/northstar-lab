import { z } from "zod";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { ToolDefinition } from "@northstar/model-client";

export type ServiceTool = {
  name: string;
  description: string;
  definition: ToolDefinition;
  inputSchema: z.ZodTypeAny;
  execute: (args: unknown, caps: CapabilitySet) => Promise<unknown>;
};

function def(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = [],
): ToolDefinition {
  return {
    name,
    description,
    parameters: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
}

/** Direct tools for the Service A2A agent (no MCP). */
export function createServiceDirectTools(): ServiceTool[] {
  return [
    {
      name: "findCustomer",
      description: "Find customers by id or name.",
      definition: def("findCustomer", "Find customers by id or name.", {
        customerId: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      }),
      inputSchema: z.object({
        customerId: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
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
      description: "List services for a customerId.",
      definition: def(
        "getCustomerServices",
        "List services for a customerId.",
        { customerId: { type: "string" } },
        ["customerId"],
      ),
      inputSchema: z.object({ customerId: z.string() }),
      execute: async (args, caps) =>
        caps.getCustomerServices((args as { customerId: string }).customerId),
    },
    {
      name: "getCustomerOrders",
      description: "List orders for a customerId.",
      definition: def(
        "getCustomerOrders",
        "List orders for a customerId.",
        { customerId: { type: "string" } },
        ["customerId"],
      ),
      inputSchema: z.object({ customerId: z.string() }),
      execute: async (args, caps) =>
        caps.getCustomerOrders((args as { customerId: string }).customerId),
    },
    {
      name: "getFaults",
      description: "List faults for a customerId.",
      definition: def(
        "getFaults",
        "List faults for a customerId.",
        { customerId: { type: "string" } },
        ["customerId"],
      ),
      inputSchema: z.object({ customerId: z.string() }),
      execute: async (args, caps) => caps.getFaults((args as { customerId: string }).customerId),
    },
    {
      name: "getNetworkIncidents",
      description: "List network incidents.",
      definition: def("getNetworkIncidents", "List network incidents.", {}),
      inputSchema: z.object({}),
      execute: async (_args, caps) => caps.getNetworkIncidents(),
    },
    {
      name: "searchKnowledge",
      description: "Search knowledge articles.",
      definition: def(
        "searchKnowledge",
        "Search knowledge articles.",
        { query: { type: "string" }, limit: { type: "integer" } },
        ["query"],
      ),
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().int().positive().optional(),
      }),
      execute: async (args, caps) => {
        const input = args as { query: string; limit?: number };
        return caps.searchKnowledge(input.query, input.limit);
      },
    },
  ];
}
