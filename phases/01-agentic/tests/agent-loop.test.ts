import { describe, expect, it } from "vitest";
import { createPhaseLogger } from "@northstar/logger";
import { MockModelClient } from "@northstar/model-client";
import { createCapabilities } from "../src/backends/factory.js";
import { runAgentTurn } from "../src/agent/loop.js";
import { createSession } from "../src/agent/session.js";
import { loadConfig } from "../src/config.js";

function setup(turns: ConstructorParameters<typeof MockModelClient>[0]) {
  const config = loadConfig({ TOOL_BACKEND: "direct" });
  const logger = createPhaseLogger({
    phase: "01-agentic",
    component: "test",
    logDir: config.logDir,
    fileName: `test-loop-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`,
    logRunStarted: false,
  });
  const capabilities = createCapabilities(config, logger);
  const model = new MockModelClient(turns);
  return { config, logger, capabilities, model, session: createSession() };
}

describe("Phase 1 agent loop (mock model)", () => {
  it("answers with no tools", async () => {
    const ctx = setup([{ type: "message", content: "Hello from Northstar lab." }]);
    const result = await runAgentTurn(ctx.session, "Hi", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.assistantText).toContain("Hello");
    expect(result.toolNamesUsed).toEqual([]);
  });

  it("runs a single tool then answers", async () => {
    const ctx = setup([
      {
        type: "tools",
        calls: [{ name: "getCustomerServices", arguments: { customerId: "CUST-1001" } }],
      },
      {
        type: "message",
        content: "CUST-1001 has Fibre 150 with line status UP (SVC-3001).",
      },
    ]);
    const result = await runAgentTurn(ctx.session, "What package does CUST-1001 have?", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.toolNamesUsed).toEqual(["getCustomerServices"]);
    expect(result.assistantText).toMatch(/Fibre 150/i);
  });

  it("runs multiple sequential tools", async () => {
    const ctx = setup([
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
        content: "PAY-8004 FAILED and PAY-8005 is PENDING; settlement is not confirmed.",
      },
    ]);
    const result = await runAgentTurn(ctx.session, "Has CUST-1005 paid?", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.toolNamesUsed).toEqual(["getBillingAccount", "getPayments"]);
    expect(result.assistantText).toMatch(/PENDING/i);
  });

  it("executes parallel tool calls in one model response", async () => {
    const ctx = setup([
      {
        type: "tools",
        calls: [
          { name: "getCustomerServices", arguments: { customerId: "CUST-1005" } },
          { name: "getFaults", arguments: { customerId: "CUST-1005" } },
        ],
      },
      {
        type: "message",
        content: "Line diagnostics PASS; access is BLOCKED — not a physical network fault.",
      },
    ]);
    const result = await runAgentTurn(ctx.session, "Is CUST-1005's broadband faulty?", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.toolNamesUsed).toEqual(["getCustomerServices", "getFaults"]);
  });

  it("asks clarification for ambiguous Patel without disclosing services", async () => {
    const ctx = setup([
      {
        type: "tools",
        calls: [{ name: "findCustomer", arguments: { lastName: "Patel" } }],
      },
      {
        type: "message",
        content:
          "Multiple customers match Patel (CUST-1002 Priya, CUST-1009 Raj). Please confirm which customerId before I show services.",
      },
    ]);
    const result = await runAgentTurn(ctx.session, "Show services for Patel", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.assistantText).toMatch(/Multiple customers|confirm/i);
    expect(result.assistantText).not.toMatch(/Fibre 50 monthly/i);
  });

  it("rejects unknown tools", async () => {
    const ctx = setup([
      { type: "tools", calls: [{ name: "deleteCustomer", arguments: { customerId: "CUST-1001" } }] },
      { type: "message", content: "I cannot use an unknown tool." },
    ]);
    const result = await runAgentTurn(ctx.session, "Delete CUST-1001", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.toolNamesUsed).toEqual(["deleteCustomer"]);
    expect(result.assistantText).toMatch(/cannot|unknown/i);
  });

  it("handles malformed tool arguments", async () => {
    const ctx = setup([
      {
        type: "tools",
        calls: [{ name: "getCustomerServices", arguments: { customerId: 123 as unknown as string } }],
      },
      { type: "message", content: "The tool arguments were invalid; please provide a customer id string." },
    ]);
    // Force invalid JSON path via raw scripted argumentsJson by using a custom complete - instead use wrong shape.
    // Mock serializes arguments with JSON.stringify so 123 becomes number - schema should fail.
    const result = await runAgentTurn(ctx.session, "services?", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.toolNamesUsed).toEqual(["getCustomerServices"]);
    expect(result.assistantText.length).toBeGreaterThan(0);
  });

  it("stops at iteration limit", async () => {
    const ctx = setup([
      { type: "tools", calls: [{ name: "getNetworkIncidents", arguments: {} }] },
      { type: "tools", calls: [{ name: "getNetworkIncidents", arguments: {} }] },
      { type: "tools", calls: [{ name: "getNetworkIncidents", arguments: {} }] },
    ]);
    const result = await runAgentTurn(ctx.session, "Keep checking incidents", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 2,
      turnTimeoutMs: 5000,
    });
    expect(result.hitIterationLimit).toBe(true);
    expect(result.assistantText).toMatch(/iteration limit/i);
  });

  it("draftSupportCase returns DRAFT only", async () => {
    const ctx = setup([
      {
        type: "tools",
        calls: [
          {
            name: "draftSupportCase",
            arguments: {
              customerId: "CUST-1005",
              subject: "Pending payment",
              summary: "Investigate pending retry and blocked access",
            },
          },
        ],
      },
      {
        type: "message",
        content: "Created support case DRAFT only; it was not submitted externally.",
      },
    ]);
    const result = await runAgentTurn(ctx.session, "Draft a case for CUST-1005", {
      model: ctx.model,
      capabilities: ctx.capabilities,
      logger: ctx.logger,
      maxIterations: 6,
      turnTimeoutMs: 5000,
    });
    expect(result.assistantText).toMatch(/DRAFT/i);
    expect(result.assistantText.toLowerCase()).not.toMatch(/submitted externally and created case number/);
  });
});
