import { afterAll, describe, expect, it } from "vitest";
import { createPhaseLogger } from "@northstar/logger";
import { connectMcpSession } from "../src/client/mcp-session.js";
import { loadConfig } from "../src/config.js";
import { EXPECTED_TOOL_NAMES } from "../src/server/tool-catalog.js";

/**
 * Spawns the real stdio MCP server process — proves discovery is not a hard-coded fake.
 */
describe("MCP stdio smoke", () => {
  const sessions: Array<{ close: () => Promise<void> }> = [];

  afterAll(async () => {
    for (const s of sessions) {
      await s.close();
    }
  });

  it("spawns server over stdio and discovers tools", async () => {
    const config = loadConfig({ MCP_TOOL_BACKEND: "direct" });
    const logger = createPhaseLogger({
      phase: "02-mcp",
      component: "mcp-host",
      logDir: config.logDir,
      fileName: `stdio-smoke-${Date.now()}.jsonl`,
      logRunStarted: false,
    });
    const mcp = await connectMcpSession({ config, logger });
    sessions.push(mcp);

    expect(mcp.tools.map((t) => t.name).sort()).toEqual([...EXPECTED_TOOL_NAMES].sort());

    const result = await mcp.client.callTool({
      name: "getFaults",
      arguments: { customerId: "CUST-1001" },
    });
    const text =
      Array.isArray(result.content) && result.content[0] && result.content[0].type === "text"
        ? result.content[0].text
        : "";
    expect(text).toContain("FLT-6001");
  }, 20000);
});
