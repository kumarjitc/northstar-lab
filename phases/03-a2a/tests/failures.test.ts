import { describe, expect, it } from "vitest";
import { MockModelClient } from "@northstar/model-client";
import { A2AClient } from "@a2a-js/sdk/client";
import { createPhaseLogger } from "@northstar/logger";
import { loadConfig } from "../src/config.js";
import { delegateToSpecialist } from "../src/orchestrator/delegation.js";
import { startTestCluster } from "./helpers.js";

describe("A2A failure modes", () => {
  it("returns a failed evidence payload when specialist is unavailable", async () => {
    const config = loadConfig({
      A2A_BILLING_PORT: "59999",
      A2A_SERVICE_PORT: "59998",
      A2A_CONTRACT_PORT: "59997",
    });
    const logger = createPhaseLogger({
      phase: "03-a2a",
      component: "orchestrator",
      logDir: config.logDir,
      fileName: `fail-unavail-${Date.now()}.jsonl`,
      logRunStarted: false,
    });

    // Point client at a dead port without discovery.
    const dead = new A2AClient({
      name: "Dead Billing",
      description: "unavailable",
      protocolVersion: "0.3.0",
      version: "0.0.0",
      url: "http://127.0.0.1:59999/",
      skills: [],
      capabilities: {},
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
    });

    const evidence = await delegateToSpecialist({
      specialist: "billing",
      clients: {
        billing: dead,
        service: dead,
        contract: dead,
      },
      config,
      logger,
      request: {
        question: "anything",
        correlation: {
          runId: logger.runId,
          sessionId: "s",
          turnId: "t",
        },
      },
    });

    expect(evidence.ok).toBe(false);
    expect(evidence.error).toBeTruthy();
  }, 30000);

  it("survives partial success when one specialist fails", async () => {
    const serviceModel = new MockModelClient([
      {
        type: "tools",
        calls: [{ name: "getFaults", arguments: { customerId: "CUST-1010" } }],
      },
      { type: "message", content: "FLT-6009 present." },
    ]);
    const idle = new MockModelClient([{ type: "message", content: "ok" }]);
    const cluster = await startTestCluster({
      models: { billing: idle, service: serviceModel, contract: idle },
    });

    try {
      const ok = await delegateToSpecialist({
        specialist: "service",
        clients: cluster.clients,
        config: cluster.config,
        logger: cluster.orchLogger,
        request: {
          question: "faults",
          customerId: "CUST-1010",
          correlation: {
            runId: cluster.orchLogger.runId,
            sessionId: "s",
            turnId: "t",
          },
        },
      });
      expect(ok.ok).toBe(true);

      const dead = new A2AClient({
        name: "Dead",
        description: "down",
        protocolVersion: "0.3.0",
        version: "0.0.0",
        url: "http://127.0.0.1:1/",
        skills: [],
        capabilities: {},
        defaultInputModes: ["text"],
        defaultOutputModes: ["text"],
      });
      const failed = await delegateToSpecialist({
        specialist: "billing",
        clients: { ...cluster.clients, billing: dead },
        config: cluster.config,
        logger: cluster.orchLogger,
        request: {
          question: "billing",
          customerId: "CUST-1010",
          correlation: {
            runId: cluster.orchLogger.runId,
            sessionId: "s",
            turnId: "t",
          },
        },
      });
      expect(failed.ok).toBe(false);
    } finally {
      await cluster.close();
    }
  }, 90000);
});
