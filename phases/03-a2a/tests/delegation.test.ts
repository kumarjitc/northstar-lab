import { describe, expect, it } from "vitest";
import { MockModelClient } from "@northstar/model-client";
import { delegateToSpecialist } from "../src/orchestrator/delegation.js";
import { runOrchestratorTurn } from "../src/orchestrator/loop.js";
import { createOrchestratorSession } from "../src/orchestrator/session.js";
import { startTestCluster } from "./helpers.js";

describe("A2A delegation", () => {
  it("delegates a single billing question over A2A and uses MCP tools in the specialist", async () => {
    const billingModel = new MockModelClient([
      {
        type: "tools",
        calls: [{ name: "getBillingAccount", arguments: { customerId: "CUST-1005" } }],
      },
      {
        type: "message",
        content:
          "BA-5005 balance 79.99 GBP, accountStatus RESTRICTED. Autopay DISABLED.",
      },
    ]);
    const idle = new MockModelClient([{ type: "message", content: "idle" }]);

    const cluster = await startTestCluster({
      models: { billing: billingModel, service: idle, contract: idle },
    });
    try {
      const evidence = await delegateToSpecialist({
        specialist: "billing",
        clients: cluster.clients,
        config: cluster.config,
        logger: cluster.orchLogger,
        request: {
          question: "What is the billing status for CUST-1005?",
          customerId: "CUST-1005",
          correlation: {
            runId: cluster.orchLogger.runId,
            sessionId: "session_test",
            turnId: "turn_test",
          },
        },
      });
      expect(evidence.ok).toBe(true);
      expect(evidence.summary).toMatch(/BA-5005|RESTRICTED|79\.99/);
    } finally {
      await cluster.close();
    }
  }, 90000);

  it("orchestrator can multi-delegate for a cross-domain question", async () => {
    const serviceModel = new MockModelClient([
      {
        type: "tools",
        calls: [
          { name: "getFaults", arguments: { customerId: "CUST-1010" } },
          { name: "getCustomerOrders", arguments: { customerId: "CUST-1010" } },
        ],
      },
      {
        type: "message",
        content: "FLT-6009 elevated restarts. ORD-2046 replacement in progress.",
      },
    ]);
    const billingModel = new MockModelClient([
      {
        type: "tools",
        calls: [
          { name: "getBillingAccount", arguments: { customerId: "CUST-1010" } },
          { name: "getBillingCases", arguments: { customerId: "CUST-1010" } },
        ],
      },
      {
        type: "message",
        content: "BILL-7009 includes 34.99. Dispute BC-9003 remains unresolved.",
      },
    ]);
    const contractModel = new MockModelClient([
      {
        type: "tools",
        calls: [{ name: "getContracts", arguments: { customerId: "CUST-1010" } }],
      },
      {
        type: "message",
        content: "CON-1110 is IN_TERM. Contract data alone does not prove a free replacement.",
      },
    ]);

    const cluster = await startTestCluster({
      models: {
        billing: billingModel,
        service: serviceModel,
        contract: contractModel,
      },
    });

    const orchModel = new MockModelClient([
      {
        type: "tools",
        calls: [
          {
            name: "delegate_service",
            arguments: {
              customerId: "CUST-1010",
              question: "Router restarting and replacement order status",
            },
          },
          {
            name: "delegate_billing",
            arguments: {
              customerId: "CUST-1010",
              question: "34.99 charge and dispute status",
            },
          },
          {
            name: "delegate_contract",
            arguments: {
              customerId: "CUST-1010",
              question: "Does contract authorise free replacement?",
            },
          },
        ],
      },
      {
        type: "message",
        content:
          "CUST-1010: FLT-6009 and ORD-2046 show a replacement in progress. BILL-7009 includes £34.99 while BC-9003 remains unresolved, so the fee is not confirmed waived. CON-1110 is IN_TERM and does not by itself prove a free replacement promise.",
      },
    ]);

    try {
      const result = await runOrchestratorTurn(
        createOrchestratorSession(),
        "CUST-1010 router restarts, replacement ordered, £34.99 on bill, promised free?",
        {
          model: orchModel,
          clients: cluster.clients,
          config: cluster.config,
          logger: cluster.orchLogger,
        },
      );
      expect(result.delegations.map((d) => d.specialist).sort()).toEqual([
        "billing",
        "contract",
        "service",
      ]);
      expect(result.delegations.every((d) => d.ok)).toBe(true);
      expect(result.assistantText).toMatch(/unresolved|IN_TERM|FLT-6009/i);
    } finally {
      await cluster.close();
    }
  }, 120000);
});
