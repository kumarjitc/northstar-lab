import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { callMcpTool } from "../src/client/mcp-session.js";
import { EXPECTED_TOOL_NAMES } from "../src/server/tool-catalog.js";
import { startInMemoryMcp } from "./helpers.js";

describe("MCP direct vs REST-backed parity", () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    const { buildApp } = await import("../../00-rest/src/app.js");
    const { loadConfig: loadRestConfig } = await import("../../00-rest/src/config.js");
    const { createPhaseLogger } = await import("@northstar/logger");
    const restConfig = loadRestConfig();
    const logger = createPhaseLogger({
      phase: "00-rest",
      component: "mcp-parity-harness",
      logDir: restConfig.logDir,
      fileName: `mcp-parity-rest-${Date.now()}.jsonl`,
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

  it("exposes identical tool names in both backends", async () => {
    const direct = await startInMemoryMcp({ backend: "direct" });
    const rest = await startInMemoryMcp({ backend: "rest", restBaseUrl: baseUrl });
    try {
      expect(direct.mcp.tools.map((t) => t.name).sort()).toEqual(
        rest.mcp.tools.map((t) => t.name).sort(),
      );
      expect(direct.mcp.tools.map((t) => t.name).sort()).toEqual(
        [...EXPECTED_TOOL_NAMES].sort(),
      );
    } finally {
      await direct.close();
      await rest.close();
    }
  });

  it("returns matching payment facts for CUST-1005", async () => {
    const direct = await startInMemoryMcp({ backend: "direct" });
    const rest = await startInMemoryMcp({ backend: "rest", restBaseUrl: baseUrl });
    try {
      const dAccount = await callMcpTool(direct.mcp, {
        name: "getBillingAccount",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: direct.hostLogger,
        mcpRequestId: "parity_d_account",
        timeoutMs: 5000,
      });
      const rAccount = await callMcpTool(rest.mcp, {
        name: "getBillingAccount",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: rest.hostLogger,
        mcpRequestId: "parity_r_account",
        timeoutMs: 5000,
      });
      const dAcc = JSON.parse(dAccount.content) as {
        ok: boolean;
        data: { billingAccountId: string; balance: number };
      };
      const rAcc = JSON.parse(rAccount.content) as {
        ok: boolean;
        data: { billingAccountId: string; balance: number };
      };
      expect(dAcc.ok && rAcc.ok).toBe(true);
      expect(rAcc.data.billingAccountId).toBe(dAcc.data.billingAccountId);
      expect(rAcc.data.balance).toBe(dAcc.data.balance);

      const billingAccountId = dAcc.data.billingAccountId;
      const dPay = await callMcpTool(direct.mcp, {
        name: "getPayments",
        argumentsJson: JSON.stringify({ billingAccountId }),
        logger: direct.hostLogger,
        mcpRequestId: "parity_d_pay",
        timeoutMs: 5000,
      });
      const rPay = await callMcpTool(rest.mcp, {
        name: "getPayments",
        argumentsJson: JSON.stringify({ billingAccountId }),
        logger: rest.hostLogger,
        mcpRequestId: "parity_r_pay",
        timeoutMs: 5000,
      });
      const dPayments = JSON.parse(dPay.content) as {
        ok: boolean;
        data: Array<{ paymentId: string; status: string }>;
      };
      const rPayments = JSON.parse(rPay.content) as {
        ok: boolean;
        data: Array<{ paymentId: string; status: string }>;
      };
      expect(dPayments.ok && rPayments.ok).toBe(true);
      expect(rPayments.data.map((p) => p.paymentId).sort()).toEqual(
        dPayments.data.map((p) => p.paymentId).sort(),
      );
      expect(rPayments.data.map((p) => p.status).sort()).toEqual(
        dPayments.data.map((p) => p.status).sort(),
      );
    } finally {
      await direct.close();
      await rest.close();
    }
  });

  it("matches fault facts for CUST-1005", async () => {
    const direct = await startInMemoryMcp({ backend: "direct" });
    const rest = await startInMemoryMcp({ backend: "rest", restBaseUrl: baseUrl });
    try {
      const dFaults = await callMcpTool(direct.mcp, {
        name: "getFaults",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: direct.hostLogger,
        mcpRequestId: "parity_d_faults",
        timeoutMs: 5000,
      });
      const rFaults = await callMcpTool(rest.mcp, {
        name: "getFaults",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: rest.hostLogger,
        mcpRequestId: "parity_r_faults",
        timeoutMs: 5000,
      });
      const d = JSON.parse(dFaults.content) as {
        ok: boolean;
        data: Array<{ faultId: string; status: string }>;
      };
      const r = JSON.parse(rFaults.content) as {
        ok: boolean;
        data: Array<{ faultId: string; status: string }>;
      };
      expect(d.ok && r.ok).toBe(true);
      expect(r.data.map((f) => f.faultId).sort()).toEqual(d.data.map((f) => f.faultId).sort());
      expect(r.data.map((f) => f.status).sort()).toEqual(d.data.map((f) => f.status).sort());
    } finally {
      await direct.close();
      await rest.close();
    }
  });

  it("fails clearly when REST backend is unavailable (no silent fallback)", async () => {
    await expect(
      startInMemoryMcp({
        backend: "rest",
        restBaseUrl: "http://127.0.0.1:1",
      }),
    ).rejects.toThrow(/MCP_TOOL_BACKEND=rest|Phase 0 REST/i);
  });
});
