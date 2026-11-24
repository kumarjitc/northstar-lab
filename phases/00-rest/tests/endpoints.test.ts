import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { JsonlLogger } from "@northstar/logger";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

describe("Phase 0 REST endpoints", () => {
  let app: FastifyInstance;
  let logFile: string;

  beforeAll(async () => {
    const config = loadConfig();
    const logger = new JsonlLogger({
      logDir: config.logDir,
      phase: "00-rest",
      component: "test",
      fileName: `test-endpoints-${Date.now()}.jsonl`,
    });
    logFile = logger.filePath;
    const built = await buildApp(config, logger);
    app = built.app;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns healthy", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("healthy");
  });

  it("GET /customers/CUST-1005 returns customer", async () => {
    const res = await app.inject({ method: "GET", url: "/customers/CUST-1005" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.customerId).toBe("CUST-1005");
  });

  it("GET /customers/CUST-9999 returns 404", async () => {
    const res = await app.inject({ method: "GET", url: "/customers/CUST-9999" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("GET /customers/bad-id returns 400", async () => {
    const res = await app.inject({ method: "GET", url: "/customers/1005" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_INPUT");
  });

  it("GET services/billing/faults for CUST-1005", async () => {
    const services = await app.inject({ method: "GET", url: "/customers/CUST-1005/services" });
    expect(services.statusCode).toBe(200);
    expect(services.json().data[0].lineState).toBe("BLOCKED");

    const account = await app.inject({
      method: "GET",
      url: "/customers/CUST-1005/billing-account",
    });
    expect(account.statusCode).toBe(200);
    const baId = account.json().data.billingAccountId;

    const payments = await app.inject({
      method: "GET",
      url: `/billing/accounts/${baId}/payments`,
    });
    expect(payments.statusCode).toBe(200);
    const statuses = payments.json().data.map((p: { status: string }) => p.status);
    expect(statuses).toContain("FAILED");
    expect(statuses).toContain("PENDING");

    const faults = await app.inject({ method: "GET", url: "/customers/CUST-1005/faults" });
    expect(faults.statusCode).toBe(200);
    expect(faults.json().data[0].diagnostics.lineTest).toBe("PASS");
  });

  it("GET /orders/ORD-2042 returns delayed order", async () => {
    const res = await app.inject({ method: "GET", url: "/orders/ORD-2042" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("DELAYED");
    expect(res.json().data.reasonCode).toBe("CIVILS_REQUIRED");
  });

  it("GET /customers/CUST-1008/contracts has NOT_STARTED", async () => {
    const res = await app.inject({ method: "GET", url: "/customers/CUST-1008/contracts" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].status).toBe("NOT_STARTED");
    expect(res.json().data[0].minimumTermEndDate).toBeNull();
  });

  it("GET /network-incidents returns incidents", async () => {
    const res = await app.inject({ method: "GET", url: "/network-incidents" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThan(0);
  });

  it("GET /knowledge/search returns ranked articles", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/knowledge/search?q=pending%20payment",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThan(0);
    expect(res.json().data[0]).toHaveProperty("articleId");
  });

  it("GET /customers/search?lastName=Patel returns multiple matches", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/customers/search?lastName=Patel",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /support-case-drafts returns DRAFT only", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/support-case-drafts",
      payload: {
        customerId: "CUST-1005",
        subject: "Pending payment and blocked service",
        summary: "Investigate pending retry and access restriction",
        relatedRecordIds: ["PAY-8005", "SVC-3008"],
        evidenceGaps: ["settlement confirmation"],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("DRAFT");
    expect(res.json().data.draftId).toMatch(/^DRAFT-/);
  });

  it("writes jsonl logs", async () => {
    const fs = await import("node:fs");
    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, "utf8");
    expect(content).toContain("http.request.started");
    expect(content).toContain("http.request.completed");
  });
});
