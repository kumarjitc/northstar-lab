import { describe, expect, it } from "vitest";
import type { LogEvent } from "./index.js";
import { buildTraceNodes, formatTraceAscii } from "./trace-graph.js";

function ev(partial: Partial<LogEvent> & Pick<LogEvent, "event" | "timestamp">): LogEvent {
  return {
    level: "INFO",
    phase: "01-agentic",
    component: "test",
    ...partial,
  };
}

describe("buildTraceNodes", () => {
  it("collapses http start/complete into one linear step", () => {
    const nodes = buildTraceNodes([
      ev({
        event: "http.request.started",
        timestamp: "2026-11-20T23:00:00.000Z",
        requestId: "req_1",
        data: { method: "GET", url: "/customers/CUST-1005" },
      }),
      ev({
        event: "http.request.completed",
        timestamp: "2026-11-20T23:00:00.012Z",
        requestId: "req_1",
        durationMs: 12,
        data: { method: "GET", url: "/customers/CUST-1005", statusCode: 200 },
      }),
      ev({
        event: "scenario.step",
        timestamp: "2026-11-20T23:00:00.020Z",
        data: { step: "getFaults", customerId: "CUST-1005" },
      }),
      ev({
        event: "scenario.decision",
        timestamp: "2026-11-20T23:00:00.021Z",
        data: { decision: "access blocked, not physical fault" },
      }),
    ]);

    expect(nodes).toHaveLength(3);
    expect(nodes[0]?.label).toContain("GET /customers/CUST-1005");
    expect(nodes[0]?.durationMs).toBe(12);
    expect(nodes[1]?.label).toContain("getFaults");
    expect(nodes[2]?.kind).toBe("decision");
    expect(nodes[2]?.explanation).toMatch(/Deterministic/i);
  });

  it("makes agentic turns readable and collapses model/tool noise", () => {
    const nodes = buildTraceNodes([
      ev({
        event: "user.message.received",
        timestamp: "2026-11-20T23:00:00.000Z",
        turnId: "turn_1",
        data: { text: "CUST-1001" },
      }),
      ev({
        event: "model.requested",
        timestamp: "2026-11-20T23:00:00.001Z",
        turnId: "turn_1",
        modelCallId: "model_1",
        data: { iteration: 1 },
      }),
      ev({
        event: "model.responded",
        timestamp: "2026-11-20T23:00:00.100Z",
        turnId: "turn_1",
        modelCallId: "model_1",
        durationMs: 99,
        data: {
          iteration: 1,
          content: "",
          toolCalls: [{ id: "t1", name: "getFaults" }],
        },
      }),
      ev({
        event: "tool.requested",
        timestamp: "2026-11-20T23:00:00.101Z",
        turnId: "turn_1",
        toolCallId: "t1",
        data: { name: "getFaults", argumentsJson: '{"customerId":"CUST-1001"}' },
      }),
      ev({
        event: "tool.started",
        timestamp: "2026-11-20T23:00:00.102Z",
        turnId: "turn_1",
        toolCallId: "t1",
        data: { name: "getFaults", kind: "read" },
      }),
      ev({
        event: "tool.completed",
        timestamp: "2026-11-20T23:00:00.103Z",
        turnId: "turn_1",
        toolCallId: "t1",
        durationMs: 1,
        data: {
          name: "getFaults",
          result: { ok: true, data: [{ faultId: "FLT-6001" }] },
        },
      }),
      ev({
        event: "agent.iteration.completed",
        timestamp: "2026-11-20T23:00:00.104Z",
        turnId: "turn_1",
        data: { iteration: 1, final: false },
      }),
      ev({
        event: "model.requested",
        timestamp: "2026-11-20T23:00:00.105Z",
        turnId: "turn_1",
        modelCallId: "model_2",
        data: { iteration: 2 },
      }),
      ev({
        event: "model.responded",
        timestamp: "2026-11-20T23:00:00.200Z",
        turnId: "turn_1",
        modelCallId: "model_2",
        durationMs: 95,
        data: { iteration: 2, content: "Open fault FLT-6001 is intermittent.", toolCalls: [] },
      }),
      ev({
        event: "assistant.response.sent",
        timestamp: "2026-11-20T23:00:00.201Z",
        turnId: "turn_1",
        data: {
          text: "Open fault FLT-6001 is intermittent.",
          toolNamesUsed: ["getFaults"],
        },
      }),
    ]);

    expect(nodes.map((n) => n.label)).toEqual([
      "You asked",
      "Model chose tool(s): getFaults",
      "Tool ran: getFaults",
      "Model drafted a reply (no tools)",
      "Agent answered",
    ]);
    expect(nodes.every((n) => Boolean(n.explanation))).toBe(true);
    expect(formatTraceAscii(nodes)).toContain("why:");
  });

  it("humanizes MCP connect/discovery/tool/server steps like agentic traces", () => {
    const nodes = buildTraceNodes([
      ev({
        event: "mcp.client.connected",
        timestamp: "2026-11-21T00:00:00.000Z",
        phase: "02-mcp",
        component: "mcp-host",
        data: { transport: "stdio", backend: "direct" },
      }),
      ev({
        event: "mcp.tools.listed",
        timestamp: "2026-11-21T00:00:00.010Z",
        phase: "02-mcp",
        component: "mcp-host",
        data: { count: 2, names: ["getFaults", "getPayments"] },
      }),
      ev({
        event: "user.message.received",
        timestamp: "2026-11-21T00:00:01.000Z",
        phase: "02-mcp",
        turnId: "turn_1",
        data: { text: "CUST-1001 faults" },
      }),
      ev({
        event: "model.requested",
        timestamp: "2026-11-21T00:00:01.001Z",
        phase: "02-mcp",
        turnId: "turn_1",
        modelCallId: "model_1",
        data: { iteration: 1 },
      }),
      ev({
        event: "model.responded",
        timestamp: "2026-11-21T00:00:01.100Z",
        phase: "02-mcp",
        turnId: "turn_1",
        modelCallId: "model_1",
        durationMs: 99,
        data: {
          iteration: 1,
          toolCalls: [{ id: "t1", name: "getFaults" }],
        },
      }),
      ev({
        event: "tool.requested",
        timestamp: "2026-11-21T00:00:01.101Z",
        phase: "02-mcp",
        turnId: "turn_1",
        toolCallId: "t1",
        mcpRequestId: "mcp_1",
        data: { name: "getFaults", argumentsJson: '{"customerId":"CUST-1001"}', via: "mcp" },
      }),
      ev({
        event: "mcp.tool.requested",
        timestamp: "2026-11-21T00:00:01.102Z",
        phase: "02-mcp",
        toolCallId: "t1",
        mcpRequestId: "mcp_1",
        data: { name: "getFaults", arguments: { customerId: "CUST-1001" } },
      }),
      ev({
        event: "mcp.server.request.received",
        timestamp: "2026-11-21T00:00:01.103Z",
        phase: "02-mcp",
        component: "mcp-server",
        mcpRequestId: "mcp_1",
        data: { tool: "getFaults", backend: "direct" },
      }),
      ev({
        event: "mcp.server.tool.executed",
        timestamp: "2026-11-21T00:00:01.104Z",
        phase: "02-mcp",
        component: "mcp-server",
        mcpRequestId: "mcp_1",
        data: { tool: "getFaults", ok: true, backend: "direct" },
      }),
      ev({
        event: "mcp.server.response.sent",
        timestamp: "2026-11-21T00:00:01.105Z",
        phase: "02-mcp",
        component: "mcp-server",
        mcpRequestId: "mcp_1",
        durationMs: 2,
        data: { tool: "getFaults", ok: true },
      }),
      ev({
        event: "mcp.tool.completed",
        timestamp: "2026-11-21T00:00:01.106Z",
        phase: "02-mcp",
        toolCallId: "t1",
        mcpRequestId: "mcp_1",
        durationMs: 4,
        data: { name: "getFaults", isError: false, preview: '{"ok":true}' },
      }),
      ev({
        event: "tool.completed",
        timestamp: "2026-11-21T00:00:01.107Z",
        phase: "02-mcp",
        turnId: "turn_1",
        toolCallId: "t1",
        mcpRequestId: "mcp_1",
        durationMs: 5,
        data: { name: "getFaults", via: "mcp", preview: '{"ok":true}' },
      }),
      ev({
        event: "model.requested",
        timestamp: "2026-11-21T00:00:01.108Z",
        phase: "02-mcp",
        turnId: "turn_1",
        modelCallId: "model_2",
        data: { iteration: 2 },
      }),
      ev({
        event: "model.responded",
        timestamp: "2026-11-21T00:00:01.200Z",
        phase: "02-mcp",
        turnId: "turn_1",
        modelCallId: "model_2",
        durationMs: 90,
        data: { iteration: 2, content: "FLT-6001 is MONITORING.", toolCalls: [] },
      }),
      ev({
        event: "assistant.response.sent",
        timestamp: "2026-11-21T00:00:01.201Z",
        phase: "02-mcp",
        turnId: "turn_1",
        data: { text: "FLT-6001 is MONITORING.", toolNamesUsed: ["getFaults"] },
      }),
    ]);

    expect(nodes.map((n) => n.label)).toEqual([
      "MCP client connected",
      "MCP discovered 2 tool(s)",
      "You asked",
      "Model chose tool(s): getFaults",
      "MCP server ran: getFaults",
      "MCP tool ran: getFaults",
      "Model drafted a reply (no tools)",
      "Agent answered",
    ]);
    expect(nodes.find((n) => n.label.startsWith("MCP tool ran"))?.explanation).toMatch(/protocol hop/i);
    expect(nodes.every((n) => Boolean(n.explanation))).toBe(true);
  });

  it("humanizes A2A discovery/delegation/synthesis and dedupes cross-process events", () => {
    const nodes = buildTraceNodes([
      ev({
        event: "a2a.agent.discovered",
        timestamp: "2026-11-21T01:00:00.000Z",
        phase: "03-a2a",
        component: "orchestrator",
        data: {
          specialist: "billing",
          name: "Billing Specialist",
          url: "http://127.0.0.1:4101",
        },
      }),
      ev({
        event: "user.message.received",
        timestamp: "2026-11-21T01:00:01.000Z",
        phase: "03-a2a",
        component: "orchestrator",
        turnId: "turn_1",
        data: { text: "CUST-1010 bill and outage" },
      }),
      ev({
        event: "a2a.delegation.started",
        timestamp: "2026-11-21T01:00:01.100Z",
        phase: "03-a2a",
        component: "orchestrator",
        a2aTaskId: "a2a_1",
        data: { specialist: "billing", question: "latest bill?" },
      }),
      ev({
        event: "a2a.delegation.started",
        timestamp: "2026-11-21T01:00:01.110Z",
        phase: "03-a2a",
        component: "billing-agent",
        a2aTaskId: "a2a_1",
        data: { specialist: "billing", question: "latest bill?" },
      }),
      ev({
        event: "a2a.task.created",
        timestamp: "2026-11-21T01:00:01.111Z",
        phase: "03-a2a",
        component: "billing-agent",
        a2aTaskId: "a2a_1",
        data: { specialist: "billing" },
      }),
      ev({
        event: "mcp.tool.completed",
        timestamp: "2026-11-21T01:00:01.200Z",
        phase: "03-a2a",
        component: "billing-agent",
        a2aTaskId: "a2a_1",
        mcpRequestId: "mcp_b1",
        durationMs: 5,
        data: { name: "getBills", isError: false, preview: '{"ok":true}' },
      }),
      ev({
        event: "a2a.task.completed",
        timestamp: "2026-11-21T01:00:01.300Z",
        phase: "03-a2a",
        component: "billing-agent",
        a2aTaskId: "a2a_1",
        data: { specialist: "billing", ok: true, summary: "Bill B-9 is OPEN" },
      }),
      ev({
        event: "a2a.delegation.completed",
        timestamp: "2026-11-21T01:00:01.310Z",
        phase: "03-a2a",
        component: "orchestrator",
        a2aTaskId: "a2a_1",
        durationMs: 210,
        data: { specialist: "billing", ok: true, preview: "Bill B-9 is OPEN" },
      }),
      ev({
        event: "a2a.synthesis.completed",
        timestamp: "2026-11-21T01:00:01.400Z",
        phase: "03-a2a",
        component: "orchestrator",
        data: { specialistsUsed: ["billing"] },
      }),
      ev({
        event: "assistant.response.sent",
        timestamp: "2026-11-21T01:00:01.401Z",
        phase: "03-a2a",
        component: "orchestrator",
        data: { text: "Bill B-9 is OPEN." },
      }),
    ]);

    expect(nodes.map((n) => n.label)).toEqual([
      "Discovered A2A agent: billing",
      "You asked",
      "A2A → billing delegated",
      "MCP tool call: getBills",
      "A2A → billing agent answered",
      "Orchestrator synthesized answer",
      "Agent answered",
    ]);
    expect(nodes.filter((n) => n.kind === "a2a")).toHaveLength(4);
    expect(formatTraceAscii(nodes)).toContain("a A2A → billing delegated");
    expect(nodes.every((n) => Boolean(n.explanation))).toBe(true);
  });
});

