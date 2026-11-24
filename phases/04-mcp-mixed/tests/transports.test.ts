import { describe, expect, it } from "vitest";
import { MockModelClient } from "@northstar/model-client";
import { callFacadeTool } from "../src/client/mcp-session.js";
import { runAgentTurn } from "../src/client/loop.js";
import { createSession } from "../src/client/session.js";
import { SERVICE_AGENT_TOOL } from "../src/shared/domains.js";
import { startMixedTestStack } from "./helpers.js";

describe("Phase 4 mixed transports", () => {
  it("exposes billing + service + contract tools on the facade", async () => {
    const serviceModel = new MockModelClient([{ type: "message", content: "idle" }]);
    const stack = await startMixedTestStack({ serviceModel });
    try {
      const names = stack.mcp.tools.map((t) => t.name).sort();
      expect(names).toContain("getBillingAccount");
      expect(names).toContain(SERVICE_AGENT_TOOL);
      expect(names).toContain("getContracts");
    } finally {
      await stack.close();
    }
  }, 90000);

  it("routes billing via MCP, service via A2A, contract via REST in one turn", async () => {
    const serviceModel = new MockModelClient([
      {
        type: "tools",
        calls: [
          { name: "getCustomerServices", arguments: { customerId: "CUST-1005" } },
          { name: "getFaults", arguments: { customerId: "CUST-1005" } },
        ],
      },
      {
        type: "message",
        content:
          "SVC-3008 is SUSPENDED with BLOCKED access due to BILLING_RESTRICTION. FLT-6005 is CLOSED_NO_FAULT.",
      },
    ]);

    const stack = await startMixedTestStack({ serviceModel });
    try {
      const hostModel = new MockModelClient([
        {
          type: "tools",
          calls: [
            { name: "getBillingAccount", arguments: { customerId: "CUST-1005" } },
            {
              name: SERVICE_AGENT_TOOL,
              arguments: {
                customerId: "CUST-1005",
                question: "Why is the service blocked?",
              },
            },
            { name: "getContracts", arguments: { customerId: "CUST-1005" } },
          ],
        },
        {
          type: "message",
          content:
            "CUST-1005 is blocked for billing restriction. BA-5005 is RESTRICTED. Service confirms BILLING_RESTRICTION. Contract CON-1105 is IN_TERM_RESTRICTED.",
        },
      ]);

      const session = createSession();
      const result = await runAgentTurn(session, "Why is CUST-1005 blocked?", {
        model: hostModel,
        mcp: stack.mcp,
        logger: stack.hostLogger,
        maxIterations: 6,
        turnTimeoutMs: 60000,
        mcpCallTimeoutMs: 20000,
      });

      expect(result.toolNamesUsed).toEqual([
        "getBillingAccount",
        SERVICE_AGENT_TOOL,
        "getContracts",
      ]);
      expect(result.assistantText).toMatch(/billing restriction|RESTRICTED|BILLING_RESTRICTION/i);

      const billing = await callFacadeTool(stack.mcp, {
        name: "getBillingAccount",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: stack.hostLogger,
        mcpRequestId: "mcp_check_bill",
        timeoutMs: 15000,
      });
      expect(billing.isError).toBe(false);
      expect(billing.content).toMatch(/BA-5005|79\.99|RESTRICTED/);

      const contract = await callFacadeTool(stack.mcp, {
        name: "getContracts",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: stack.hostLogger,
        mcpRequestId: "mcp_check_con",
        timeoutMs: 15000,
      });
      expect(contract.isError).toBe(false);
      expect(contract.content).toMatch(/CON-1105/);
    } finally {
      await stack.close();
    }
  }, 120000);

  it("surfaces service agent failure without inventing evidence", async () => {
    const serviceModel = new MockModelClient([
      { type: "message", content: "idle" },
    ]);
    const stack = await startMixedTestStack({ serviceModel });
    try {
      await stack.service.close();
      const result = await callFacadeTool(stack.mcp, {
        name: SERVICE_AGENT_TOOL,
        argumentsJson: JSON.stringify({
          question: "Any faults?",
          customerId: "CUST-1005",
        }),
        logger: stack.hostLogger,
        mcpRequestId: "mcp_fail_svc",
        timeoutMs: 8000,
      });
      const body = result.content;
      expect(result.isError || /ok":false|"error"|ECONNREFUSED|fetch failed|not running|abort/i.test(body)).toBe(
        true,
      );
    } finally {
      await stack.close();
    }
  }, 90000);
});
