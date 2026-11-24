import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createPhaseLogger } from "@northstar/logger";
import { createCapabilities } from "../src/backends/factory.js";
import { loadConfig } from "../src/config.js";

/**
 * Parity between direct domain-services and REST-backed capabilities.
 * Boots Phase 0 in-process via its public buildApp entry without importing
 * Phase 0 source into the agentic runtime path used by tools.
 */
describe("direct vs REST capability parity", () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    const { buildApp } = await import("../../00-rest/src/app.js");
    const { loadConfig: loadRestConfig } = await import("../../00-rest/src/config.js");
    const restConfig = loadRestConfig();
    const logger = createPhaseLogger({
      phase: "00-rest",
      component: "parity-harness",
      logDir: restConfig.logDir,
      fileName: `parity-rest-${Date.now()}.jsonl`,
      logRunStarted: false,
    });
    const built = await buildApp(restConfig, logger);
    app = built.app;
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("No listen address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function caps(backend: "direct" | "rest") {
    const config = loadConfig({
      TOOL_BACKEND: backend,
      NORTHSTAR_REST_BASE_URL: baseUrl,
    });
    const logger = createPhaseLogger({
      phase: "01-agentic",
      component: "parity",
      logDir: config.logDir,
      fileName: `parity-${backend}-${Date.now()}.jsonl`,
      logRunStarted: false,
    });
    return createCapabilities(config, logger);
  }

  it("customer + payments facts match for CUST-1005", async () => {
    const direct = caps("direct");
    const rest = caps("rest");

    const dCustomer = await direct.getCustomer("CUST-1005");
    const rCustomer = await rest.getCustomer("CUST-1005");
    expect(dCustomer.ok && rCustomer.ok).toBe(true);
    if (dCustomer.ok && rCustomer.ok) {
      expect(rCustomer.data.customerId).toBe(dCustomer.data.customerId);
      expect(rCustomer.data.status).toBe(dCustomer.data.status);
    }

    const dAccount = await direct.getBillingAccount("CUST-1005");
    const rAccount = await rest.getBillingAccount("CUST-1005");
    expect(dAccount.ok && rAccount.ok).toBe(true);
    if (!dAccount.ok || !rAccount.ok) return;

    const dPayments = await direct.getPayments(dAccount.data.billingAccountId);
    const rPayments = await rest.getPayments(rAccount.data.billingAccountId);
    expect(dPayments.ok && rPayments.ok).toBe(true);
    if (dPayments.ok && rPayments.ok) {
      expect(rPayments.data.map((p) => p.paymentId).sort()).toEqual(
        dPayments.data.map((p) => p.paymentId).sort(),
      );
      expect(rPayments.data.map((p) => p.status).sort()).toEqual(
        dPayments.data.map((p) => p.status).sort(),
      );
    }
  });

  it("not-found and invalid-input normalize similarly", async () => {
    const direct = caps("direct");
    const rest = caps("rest");

    const dMissing = await direct.getCustomer("CUST-9999");
    const rMissing = await rest.getCustomer("CUST-9999");
    expect(dMissing.ok).toBe(false);
    expect(rMissing.ok).toBe(false);
    if (!dMissing.ok && !rMissing.ok) {
      expect(dMissing.error.code).toBe("NOT_FOUND");
      expect(rMissing.error.code).toBe("NOT_FOUND");
    }

    const dInvalid = await direct.getCustomer("1005");
    const rInvalid = await rest.getCustomer("1005");
    expect(dInvalid.ok).toBe(false);
    expect(rInvalid.ok).toBe(false);
    if (!dInvalid.ok && !rInvalid.ok) {
      expect(dInvalid.error.code).toBe("INVALID_INPUT");
      expect(rInvalid.error.code).toBe("INVALID_INPUT");
    }
  });

  it("Patel search returns multiple matches in both backends", async () => {
    const direct = caps("direct");
    const rest = caps("rest");
    const d = await direct.findCustomersByName({ lastName: "Patel" });
    const r = await rest.findCustomersByName({ lastName: "Patel" });
    expect(d.ok && r.ok).toBe(true);
    if (d.ok && r.ok) {
      expect(d.data.length).toBeGreaterThanOrEqual(2);
      expect(r.data.length).toBe(d.data.length);
    }
  });

  it("REST backend fails clearly when server is down", async () => {
    const config = loadConfig({
      TOOL_BACKEND: "rest",
      NORTHSTAR_REST_BASE_URL: "http://127.0.0.1:9",
      REST_REQUEST_TIMEOUT_MS: "300",
    });
    const logger = createPhaseLogger({
      phase: "01-agentic",
      component: "parity-down",
      logDir: config.logDir,
      fileName: `parity-down-${Date.now()}.jsonl`,
      logRunStarted: false,
    });
    const rest = createCapabilities(config, logger);
    const result = await rest.getCustomer("CUST-1001");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAVAILABLE");
      expect(result.error.message).toMatch(/unavailable|Phase 0|timed out|fetch/i);
    }
  });
});
