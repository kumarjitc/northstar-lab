import { describe, expect, it } from "vitest";
import { MockModelClient } from "@northstar/model-client";
import { runAgentTurn } from "../src/client/loop.js";
import { createSession } from "../src/client/session.js";
import { startInMemoryMcp } from "./helpers.js";

describe("MCP host agent loop", () => {
  it("answers with no tools", async () => {
    const harness = await startInMemoryMcp();
    try {
      const result = await runAgentTurn(createSession(), "hello", {
        model: new MockModelClient([{ type: "message", content: "Hi — how can I help?" }]),
        mcp: harness.mcp,
        logger: harness.hostLogger,
        maxIterations: 4,
        turnTimeoutMs: 5000,
        mcpCallTimeoutMs: 5000,
      });
      expect(result.assistantText).toContain("Hi");
      expect(result.toolNamesUsed).toEqual([]);
    } finally {
      await harness.close();
    }
  });

  it("runs a tool through MCP then answers", async () => {
    const harness = await startInMemoryMcp();
    try {
      const result = await runAgentTurn(createSession(), "faults for CUST-1001", {
        model: new MockModelClient([
          {
            type: "tools",
            calls: [{ name: "getFaults", arguments: { customerId: "CUST-1001" } }],
          },
          {
            type: "message",
            content: "Open fault FLT-6001 is MONITORING / INTERMITTENT.",
          },
        ]),
        mcp: harness.mcp,
        logger: harness.hostLogger,
        maxIterations: 4,
        turnTimeoutMs: 5000,
        mcpCallTimeoutMs: 5000,
      });
      expect(result.toolNamesUsed).toEqual(["getFaults"]);
      expect(result.assistantText).toContain("FLT-6001");
    } finally {
      await harness.close();
    }
  });

  it("surfaces MCP errors without inventing results", async () => {
    const harness = await startInMemoryMcp();
    try {
      const result = await runAgentTurn(createSession(), "unknown tool path", {
        model: new MockModelClient([
          {
            type: "tools",
            calls: [{ name: "notARealTool", arguments: {} }],
          },
          {
            type: "message",
            content: "The MCP tool call failed; I cannot invent account facts.",
          },
        ]),
        mcp: harness.mcp,
        logger: harness.hostLogger,
        maxIterations: 4,
        turnTimeoutMs: 5000,
        mcpCallTimeoutMs: 5000,
      });
      expect(result.toolNamesUsed).toEqual(["notARealTool"]);
      expect(result.assistantText.toLowerCase()).toMatch(/failed|cannot invent/);
    } finally {
      await harness.close();
    }
  });
});
