import { describe, expect, it } from "vitest";
import { MockModelClient } from "@northstar/model-client";
import { assertNoForbiddenClaims, getScenario } from "@northstar/scenario-kit";
import { runOrchestratorTurn } from "../src/orchestrator/loop.js";
import { createOrchestratorSession } from "../src/orchestrator/session.js";
import { startTestCluster } from "./helpers.js";

/**
 * Mandatory Phase 3 cross-domain demo (CUST-1010).
 * Orchestrator must hit Service + Billing + Contract over A2A.
 */
describe("CUST-1010 cross-domain A2A scenario", () => {
  it("delegates to all three specialists and synthesises without inventing waiver", async () => {
    const scenario = getScenario("S09");
    const prompt =
      scenario?.userPrompt ??
      "CUST-1010 reports a restarting router. A replacement is ordered, £34.99 appears on the bill, and the customer says the replacement was promised free. Explain the situation and what should happen next.";

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
        content:
          "FLT-6009 shows elevated router restarts. ORD-2046 router replacement is in progress. No reconnect promise from service data alone.",
      },
    ]);
    const billingModel = new MockModelClient([
      {
        type: "tools",
        calls: [
          { name: "getBillingAccount", arguments: { customerId: "CUST-1010" } },
          { name: "getBills", arguments: { billingAccountId: "BA-5010" } },
          { name: "getBillingCases", arguments: { customerId: "CUST-1010" } },
        ],
      },
      {
        type: "message",
        content:
          "BILL-7009 includes £34.99 equipment-related charge. Fee waiver evidence is NOT_FOUND. Dispute BC-9003 remains unresolved.",
      },
    ]);
    const contractModel = new MockModelClient([
      {
        type: "tools",
        calls: [{ name: "getContracts", arguments: { customerId: "CUST-1010" } }],
      },
      {
        type: "message",
        content:
          "CON-1110 is IN_TERM. Contract records do not themselves authorise a free replacement or fee waiver.",
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
              question: "Restarting router fault and replacement order status",
            },
          },
          {
            name: "delegate_billing",
            arguments: {
              customerId: "CUST-1010",
              question: "£34.99 charge and any dispute/waiver evidence",
            },
          },
          {
            name: "delegate_contract",
            arguments: {
              customerId: "CUST-1010",
              question: "Contract status and whether it authorises free replacement",
            },
          },
        ],
      },
      {
        type: "message",
        content:
          "For CUST-1010: Service evidence shows FLT-6009 and replacement ORD-2046 in progress. Billing shows £34.99 on BILL-7009 while dispute BC-9003 remains unresolved and fee-waiver evidence is missing — so the charge is not confirmed waived. Contract CON-1110 is IN_TERM and does not by itself prove a free-replacement promise. Next step: continue the dispute with missing consent/waiver evidence documented; do not invent a settlement.",
      },
    ]);

    try {
      const result = await runOrchestratorTurn(createOrchestratorSession(), prompt, {
        model: orchModel,
        clients: cluster.clients,
        config: cluster.config,
        logger: cluster.orchLogger,
      });

      expect(result.delegations).toHaveLength(3);
      expect(result.delegations.map((d) => d.specialist).sort()).toEqual([
        "billing",
        "contract",
        "service",
      ]);
      expect(result.assistantText).toMatch(/unresolved|NOT_FOUND|missing/i);
      expect(result.assistantText).not.toMatch(/fee (has been|is) waived/i);
      if (scenario) {
        expect(assertNoForbiddenClaims(result.assistantText, scenario.forbiddenClaims)).toEqual(
          [],
        );
      }
    } finally {
      await cluster.close();
    }
  }, 120000);
});
