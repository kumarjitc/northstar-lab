import { describe, expect, it } from "vitest";
import { createPhaseLogger } from "@northstar/logger";
import { MockModelClient } from "@northstar/model-client";
import { assertNoForbiddenClaims, getScenario } from "@northstar/scenario-kit";
import { createCapabilities } from "../src/backends/factory.js";
import { runAgentTurn } from "../src/agent/loop.js";
import { createSession } from "../src/agent/session.js";
import { loadConfig } from "../src/config.js";

async function runScripted(
  prompt: string,
  turns: ConstructorParameters<typeof MockModelClient>[0],
) {
  const config = loadConfig({ TOOL_BACKEND: "direct" });
  const logger = createPhaseLogger({
    phase: "01-agentic",
    component: "scenario-test",
    logDir: config.logDir,
    fileName: `scenario-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`,
    logRunStarted: false,
  });
  const result = await runAgentTurn(createSession(), prompt, {
    model: new MockModelClient(turns),
    capabilities: createCapabilities(config, logger),
    logger,
    maxIterations: 6,
    turnTimeoutMs: 5000,
  });
  return result;
}

describe("scripted scenario tool paths S03/S06/S09", () => {
  it("S03 payment pending path", async () => {
    const scenario = getScenario("S03")!;
    const result = await runScripted(scenario.userPrompt, [
      {
        type: "tools",
        calls: [{ name: "getBillingAccount", arguments: { customerId: "CUST-1005" } }],
      },
      {
        type: "tools",
        calls: [{ name: "getPayments", arguments: { billingAccountId: "BA-5005" } }],
      },
      {
        type: "message",
        content:
          "PAY-8004 FAILED due to insufficient funds. Retry PAY-8005 is PENDING, so settlement is not confirmed and the bill has not been paid.",
      },
    ]);
    expect(result.toolNamesUsed.length).toBeGreaterThanOrEqual(2);
    expect(assertNoForbiddenClaims(result.assistantText, scenario.forbiddenClaims)).toEqual([]);
  });

  it("S06 access restriction not fault", async () => {
    const scenario = getScenario("S06")!;
    const result = await runScripted(scenario.userPrompt, [
      {
        type: "tools",
        calls: [
          { name: "getCustomerServices", arguments: { customerId: "CUST-1005" } },
          { name: "getFaults", arguments: { customerId: "CUST-1005" } },
          { name: "getBillingCases", arguments: { customerId: "CUST-1005" } },
        ],
      },
      {
        type: "message",
        content:
          "Diagnostics lineTest PASS with accessState BLOCKED under BILLING_RESTRICTION. Physical network fault is not indicated. Reconnection cannot be promised until settlement is confirmed.",
      },
    ]);
    expect(result.toolNamesUsed).toContain("getFaults");
    expect(assertNoForbiddenClaims(result.assistantText, scenario.forbiddenClaims)).toEqual([]);
  });

  it("S09 equipment dispute remains unresolved", async () => {
    const scenario = getScenario("S09")!;
    const result = await runScripted(scenario.userPrompt, [
      {
        type: "tools",
        calls: [
          { name: "getFaults", arguments: { customerId: "CUST-1010" } },
          { name: "getCustomerOrders", arguments: { customerId: "CUST-1010" } },
        ],
      },
      {
        type: "tools",
        calls: [
          { name: "getBillingAccount", arguments: { customerId: "CUST-1010" } },
          { name: "getBillingCases", arguments: { customerId: "CUST-1010" } },
          { name: "getContracts", arguments: { customerId: "CUST-1010" } },
        ],
      },
      {
        type: "tools",
        calls: [{ name: "getBills", arguments: { billingAccountId: "BA-5010" } }],
      },
      {
        type: "message",
        content:
          "FLT-6009 shows elevated router restarts. ORD-2046 replacement is in progress. BILL-7009 includes £34.99. Fee waiver is NOT_FOUND and dispute BC-9003 remains unresolved. Replacement order does not prove the fee is valid. Contract CON-1110 is IN_TERM.",
      },
    ]);
    expect(result.toolNamesUsed.length).toBeGreaterThanOrEqual(3);
    expect(assertNoForbiddenClaims(result.assistantText, scenario.forbiddenClaims)).toEqual([]);
  });
});
