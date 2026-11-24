import { describe, expect, it } from "vitest";
import { callMcpTool, readMcpResource } from "../src/client/mcp-session.js";
import { EXPECTED_TOOL_NAMES } from "../src/server/tool-catalog.js";
import { startInMemoryMcp } from "./helpers.js";

describe("MCP protocol (in-memory transport)", () => {
  it("handshakes and discovers the stable tool catalog", async () => {
    const harness = await startInMemoryMcp();
    try {
      expect(harness.mcp.tools.map((t) => t.name).sort()).toEqual(
        [...EXPECTED_TOOL_NAMES].sort(),
      );
      for (const tool of harness.mcp.tools) {
        expect(tool.description.length).toBeGreaterThan(5);
        expect(tool.parameters).toBeTruthy();
      }
    } finally {
      await harness.close();
    }
  });

  it("invokes getFaults successfully", async () => {
    const harness = await startInMemoryMcp();
    try {
      const result = await callMcpTool(harness.mcp, {
        name: "getFaults",
        argumentsJson: JSON.stringify({ customerId: "CUST-1001" }),
        logger: harness.hostLogger,
        mcpRequestId: "mcp_test_faults",
        timeoutMs: 5000,
      });
      expect(result.isError).toBe(false);
      const parsed = JSON.parse(result.content) as {
        ok: boolean;
        data: Array<{ faultId: string }>;
      };
      expect(parsed.ok).toBe(true);
      expect(parsed.data.some((f) => f.faultId === "FLT-6001")).toBe(true);
    } finally {
      await harness.close();
    }
  });

  it("rejects invalid arguments via MCP validation", async () => {
    const harness = await startInMemoryMcp();
    try {
      const result = await callMcpTool(harness.mcp, {
        name: "getPayments",
        argumentsJson: JSON.stringify({}),
        logger: harness.hostLogger,
        mcpRequestId: "mcp_test_invalid",
        timeoutMs: 5000,
      });
      // SDK may surface as isError or throw into our catch path as MCP_ERROR content.
      expect(result.isError || result.content.toLowerCase().includes("invalid")).toBe(true);
    } finally {
      await harness.close();
    }
  });

  it("returns an error for unknown tools", async () => {
    const harness = await startInMemoryMcp();
    try {
      const result = await callMcpTool(harness.mcp, {
        name: "notARealTool",
        argumentsJson: "{}",
        logger: harness.hostLogger,
        mcpRequestId: "mcp_test_unknown",
        timeoutMs: 5000,
      });
      expect(result.isError).toBe(true);
    } finally {
      await harness.close();
    }
  });

  it("lists and reads knowledge resources", async () => {
    const harness = await startInMemoryMcp();
    try {
      const listed = await harness.mcp.client.listResources();
      expect(listed.resources.length).toBeGreaterThan(0);

      const indexText = await readMcpResource(
        harness.mcp,
        "knowledge://articles",
        harness.hostLogger,
        "mcp_res_index",
      );
      const index = JSON.parse(indexText) as Array<{ articleId: string; uri: string }>;
      expect(index.length).toBeGreaterThan(0);

      const first = index[0]!;
      const body = await readMcpResource(
        harness.mcp,
        first.uri,
        harness.hostLogger,
        "mcp_res_article",
      );
      expect(body).toContain(first.articleId);
      expect(body.length).toBeGreaterThan(20);
    } finally {
      await harness.close();
    }
  });

  it("correlates host and server logs with mcpRequestId", async () => {
    const harness = await startInMemoryMcp({ logFilePrefix: "mcp-corr" });
    try {
      const mcpRequestId = "mcp_corr_abc";
      await callMcpTool(harness.mcp, {
        name: "getBillingAccount",
        argumentsJson: JSON.stringify({ customerId: "CUST-1005" }),
        logger: harness.hostLogger,
        mcpRequestId,
        timeoutMs: 5000,
      });

      const { readJsonl } = await import("@northstar/logger");
      const hostEvents = readJsonl(harness.hostLogger.filePath);
      const serverEvents = readJsonl(harness.serverLogger.filePath);

      expect(hostEvents.some((e) => e.mcpRequestId === mcpRequestId)).toBe(true);
      expect(serverEvents.some((e) => e.mcpRequestId === mcpRequestId)).toBe(true);
      expect(serverEvents.some((e) => e.event === "mcp.server.tool.executed")).toBe(true);
    } finally {
      await harness.close();
    }
  });
});
