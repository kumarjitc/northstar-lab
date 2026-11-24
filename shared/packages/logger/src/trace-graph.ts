import type { LogEvent } from "./index.js";

export type TraceKind =
  | "run"
  | "http"
  | "scenario"
  | "decision"
  | "model"
  | "tool"
  | "mcp"
  | "a2a"
  | "user"
  | "assistant"
  | "other"
  | "error";

export type TraceNode = {
  id: string;
  /** Short human headline shown in the graph. */
  label: string;
  /** Plain-language explanation of what this step means. */
  explanation?: string;
  /** Compact evidence / payload summary. */
  detail?: string;
  kind: TraceKind;
  timestamp: string;
  durationMs?: number;
  event: string;
};

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(11, 23);
}

function clip(text: string, max = 220): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function summarizeJson(value: unknown, max = 220): string {
  try {
    return clip(JSON.stringify(value), max);
  } catch {
    return clip(String(value), max);
  }
}

function httpLabel(data: Record<string, unknown>): string {
  const method = typeof data.method === "string" ? data.method : "HTTP";
  const url = typeof data.url === "string" ? data.url : "";
  const status = data.statusCode !== undefined ? ` → ${String(data.statusCode)}` : "";
  return `${method} ${url}${status}`.trim();
}

function scenarioLabel(event: string, data: Record<string, unknown>): string {
  if (event === "scenario.step") {
    const step = typeof data.step === "string" ? data.step : "step";
    const extra =
      typeof data.customerId === "string"
        ? ` ${data.customerId}`
        : typeof data.billingAccountId === "string"
          ? ` ${data.billingAccountId}`
          : "";
    return `Looked up ${step}${extra}`;
  }
  if (event === "scenario.decision") {
    const decision =
      typeof data.decision === "string"
        ? data.decision
        : Array.isArray(data.decisions)
          ? data.decisions.map(String).slice(-1)[0]
          : "decision";
    return `Decision: ${decision}`;
  }
  if (event === "scenario.completed") {
    const id = typeof data.id === "string" ? data.id : "";
    return `Scenario finished${id ? `: ${id}` : ""}`;
  }
  return event;
}

function summarizeToolResult(result: unknown): string {
  const rec = asRecord(result);
  if (rec.ok === false) {
    const error = asRecord(rec.error);
    return `Tool failed: ${typeof error.message === "string" ? error.message : summarizeJson(error)}`;
  }
  if (rec.ok === true) {
    const data = rec.data;
    if (Array.isArray(data)) {
      return `Returned ${data.length} record(s). ${summarizeJson(data[0] ?? [])}`;
    }
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const idKeys = ["customerId", "faultId", "orderId", "billId", "paymentId", "contractId", "draftId", "status"];
      const bits = idKeys
        .filter((k) => obj[k] !== undefined)
        .map((k) => `${k}=${String(obj[k])}`);
      if (bits.length) return `Returned ${bits.join(", ")}`;
    }
    return `Returned ${summarizeJson(data)}`;
  }
  return summarizeJson(result);
}

function parseArgsJson(raw: unknown): string {
  if (typeof raw !== "string") return summarizeJson(raw);
  try {
    return summarizeJson(JSON.parse(raw));
  } catch {
    return clip(raw);
  }
}

/**
 * Build a learner-friendly linear trace:
 * - collapses noisy event pairs (HTTP, model, tool lifecycle)
 * - uses plain-language labels and short explanations
 */
export function buildTraceNodes(events: LogEvent[]): TraceNode[] {
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const nodes: TraceNode[] = [];
  const openHttp = new Map<string, LogEvent>();
  const openModel = new Map<string, LogEvent>();
  const openTool = new Map<string, { requested?: LogEvent; started?: LogEvent }>();
  const openMcpTool = new Map<string, LogEvent>();
  const openMcpServer = new Map<string, LogEvent>();
  /** First a2a.delegation.started per task (orchestrator or specialist). */
  const seenA2aStarts = new Set<string>();
  /** First a2a.* completed/failed per task — ignore cross-process duplicates. */
  const a2aCompletedTasks = new Set<string>();
  /** When host also logs tool.*(via=mcp), skip duplicate mcp.tool.* for the same id. */
  const hostToolMcpIds = new Set<string>();
  for (const e of sorted) {
    if (
      e.mcpRequestId &&
      (e.event === "tool.requested" ||
        e.event === "tool.started" ||
        e.event === "tool.completed" ||
        e.event === "tool.failed")
    ) {
      hostToolMcpIds.add(e.mcpRequestId);
    }
  }
  let i = 0;

  const push = (node: Omit<TraceNode, "id">) => {
    nodes.push({ id: `n${i++}`, ...node });
  };

  for (const event of sorted) {
    const data = asRecord(event.data);
    const name = event.event;

    if (name === "http.request.started") {
      openHttp.set(event.requestId ?? `${event.timestamp}:${i}`, event);
      continue;
    }
    if (name === "http.request.completed") {
      const key = event.requestId ?? "";
      const start = key ? openHttp.get(key) : undefined;
      if (key) openHttp.delete(key);
      const merged = { ...asRecord(start?.data), ...data };
      push({
        label: `REST call: ${httpLabel(merged)}`,
        explanation: "Phase 0 (or REST-backed) HTTP request completed.",
        detail: event.requestId ? `requestId=${event.requestId}` : undefined,
        kind: "http",
        timestamp: start?.timestamp ?? event.timestamp,
        durationMs: event.durationMs,
        event: "http.request",
      });
      continue;
    }
    if (name === "http.request.failed") {
      push({
        label: `REST call failed`,
        explanation: "The HTTP capability backend was unavailable or returned an error.",
        detail: typeof data.message === "string" ? data.message : summarizeJson(data),
        kind: "error",
        timestamp: event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    if (name.startsWith("rest.client.request.")) {
      if (name.endsWith(".started")) continue;
      const path = typeof data.path === "string" ? data.path : "";
      const method = typeof data.method === "string" ? data.method : "HTTP";
      const status = data.status !== undefined ? ` → ${String(data.status)}` : "";
      push({
        label: `Capability over REST: ${method} ${path}${status}`,
        explanation:
          "REST-backed mode: the capability hop went to the Phase 0 API (Phase 1 TOOL_BACKEND=rest or Phase 2 MCP_TOOL_BACKEND=rest).",
        detail: summarizeJson(data),
        kind: "http",
        timestamp: event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    if (name.startsWith("scenario.")) {
      push({
        label: scenarioLabel(name, data),
        explanation:
          name === "scenario.decision"
            ? "Deterministic Phase 0 branching decided what the evidence means."
            : name === "scenario.completed"
              ? "Coded scenario finished and produced a conclusion."
              : "Deterministic scenario explicitly called this lookup.",
        detail:
          name === "scenario.completed" && typeof data.conclusion === "string"
            ? clip(data.conclusion, 320)
            : undefined,
        kind: name === "scenario.decision" ? "decision" : "scenario",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "run.started") {
      push({
        label: "Run started",
        explanation: "A new process/session log file was opened for this execution.",
        detail: summarizeJson(data),
        kind: "run",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }
    if (name === "run.completed") {
      push({
        label: "Run finished",
        explanation: "This process ended (quit, completion, or shutdown).",
        detail: summarizeJson(data),
        kind: "run",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }
    if (name === "server.listening") {
      push({
        label: "REST server listening",
        explanation: "Phase 0 API is ready to accept requests.",
        detail: summarizeJson(data),
        kind: "run",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }
    if (name === "capability.backend.selected") {
      const backend = String(data.capabilityBackend ?? data.toolBackend ?? "unknown");
      push({
        label: `Capability backend: ${backend}`,
        explanation:
          backend === "rest"
            ? "Tools will call Phase 0 over HTTP."
            : backend === "direct"
              ? "Tools will call domain services in-process (no REST hop)."
              : "Selected capability transport for this run.",
        detail: summarizeJson(data),
        kind: "run",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "user.message.received") {
      const text = typeof data.text === "string" ? data.text : summarizeJson(data);
      push({
        label: "You asked",
        explanation: "User turn entered the agent loop.",
        detail: clip(text, 320),
        kind: "user",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "assistant.response.sent") {
      const text = typeof data.text === "string" ? data.text : summarizeJson(data);
      const tools = Array.isArray(data.toolNamesUsed)
        ? data.toolNamesUsed.map(String).join(" → ")
        : "";
      push({
        label: "Agent answered",
        explanation: tools
          ? `Final reply after tools: ${tools}.`
          : "Final reply with no further tool calls.",
        detail: clip(text, 400),
        kind: "assistant",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "model.requested") {
      const key = event.modelCallId ?? `${event.turnId ?? "turn"}:${String(data.iteration ?? i)}`;
      openModel.set(key, event);
      continue;
    }
    if (name === "model.responded") {
      const key = event.modelCallId ?? `${event.turnId ?? "turn"}:${String(data.iteration ?? i)}`;
      const start = openModel.get(key);
      if (key) openModel.delete(key);
      const startData = asRecord(start?.data);
      const iteration = data.iteration ?? startData.iteration;
      const toolCalls = Array.isArray(data.toolCalls) ? data.toolCalls : [];
      const content = typeof data.content === "string" ? data.content : "";
      if (toolCalls.length > 0) {
        const names = toolCalls
          .map((c) => asRecord(c).name)
          .filter((n): n is string => typeof n === "string");
        push({
          label: `Model chose tool(s): ${names.join(", ") || "unknown"}`,
          explanation: `Thinking step ${String(iteration ?? "?")}: the model decided it needs tool evidence before answering.`,
          detail: content ? clip(content, 160) : undefined,
          kind: "model",
          timestamp: start?.timestamp ?? event.timestamp,
          durationMs: event.durationMs,
          event: "model.responded",
        });
      } else {
        push({
          label: "Model drafted a reply (no tools)",
          explanation: `Thinking step ${String(iteration ?? "?")}: the model answered from conversation/context without calling tools.`,
          detail: content ? clip(content, 320) : undefined,
          kind: "model",
          timestamp: start?.timestamp ?? event.timestamp,
          durationMs: event.durationMs,
          event: "model.responded",
        });
      }
      continue;
    }

    if (name === "agent.iteration.completed") {
      // Folded into model/tool/assistant steps to reduce noise.
      continue;
    }

    if (name === "tool.requested") {
      const key = event.toolCallId ?? `${event.timestamp}:req:${i}`;
      openTool.set(key, { ...(openTool.get(key) ?? {}), requested: event });
      continue;
    }
    if (name === "tool.started") {
      const key = event.toolCallId ?? `${event.timestamp}:start:${i}`;
      // Prefer matching by toolCallId from requested; if only started arrives, store it.
      const existing =
        (event.toolCallId ? openTool.get(event.toolCallId) : undefined) ??
        openTool.get(key) ??
        {};
      const storeKey = event.toolCallId ?? key;
      openTool.set(storeKey, { ...existing, started: event });
      continue;
    }
    if (name === "tool.completed" || name === "tool.failed") {
      const key = event.toolCallId ?? "";
      const open = key ? openTool.get(key) : undefined;
      if (key) openTool.delete(key);
      const reqData = asRecord(open?.requested?.data);
      const startData = asRecord(open?.started?.data);
      const toolName =
        (typeof data.name === "string" && data.name) ||
        (typeof reqData.name === "string" && reqData.name) ||
        "tool";
      const args = parseArgsJson(reqData.argumentsJson ?? data.argumentsJson);
      const failed = name === "tool.failed";
      const viaMcp =
        reqData.via === "mcp" ||
        startData.via === "mcp" ||
        data.via === "mcp" ||
        Boolean(event.mcpRequestId);
      push({
        label: failed
          ? viaMcp
            ? `MCP tool failed: ${toolName}`
            : `Tool failed: ${toolName}`
          : viaMcp
            ? `MCP tool ran: ${toolName}`
            : `Tool ran: ${toolName}`,
        explanation: failed
          ? viaMcp
            ? "The host called an MCP tool and received an error; the model saw that payload."
            : "The tool call did not succeed; the model received an error payload."
          : viaMcp
            ? "Host → MCP client → MCP server → capability. This is the Phase 2 protocol hop (not a local Phase 1 registry call)."
            : "The agent fetched factual Northstar data through a capability (direct or REST).",
        detail: failed
          ? summarizeJson(data)
          : data.preview
            ? `args ${args} · ${clip(String(data.preview), 220)}`
            : `args ${args} · ${summarizeToolResult(data.result)}`,
        kind: failed ? "error" : viaMcp ? "mcp" : "tool",
        // For MCP, use completion time so "server ran" appears before "tool ran" in the story.
        timestamp: viaMcp
          ? event.timestamp
          : (open?.requested?.timestamp ?? open?.started?.timestamp ?? event.timestamp),
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    if (name === "mcp.client.connected") {
      push({
        label: "MCP client connected",
        explanation: "Host opened a session to the MCP server (stdio or in-memory transport).",
        detail:
          typeof data.transport === "string"
            ? `transport=${data.transport}${data.backend ? ` · backend=${String(data.backend)}` : ""}`
            : summarizeJson(data),
        kind: "mcp",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "mcp.tools.listed") {
      const names = Array.isArray(data.names) ? data.names.map(String) : [];
      push({
        label: `MCP discovered ${String(data.count ?? names.length)} tool(s)`,
        explanation:
          "Tool names/schemas came from real MCP listTools — not a hard-coded Phase 1 registry import.",
        detail: names.length ? clip(names.join(", "), 280) : summarizeJson(data),
        kind: "mcp",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "mcp.tool.requested") {
      const key = event.mcpRequestId ?? `${event.timestamp}:mcp:${i}`;
      if (event.mcpRequestId && hostToolMcpIds.has(event.mcpRequestId)) {
        continue;
      }
      openMcpTool.set(key, event);
      continue;
    }
    if (name === "mcp.tool.completed") {
      const key = event.mcpRequestId ?? "";
      if (key && hostToolMcpIds.has(key)) {
        openMcpTool.delete(key);
        continue;
      }
      const start = key ? openMcpTool.get(key) : undefined;
      if (key) openMcpTool.delete(key);
      const startData = asRecord(start?.data);
      const toolName =
        (typeof data.name === "string" && data.name) ||
        (typeof startData.name === "string" && startData.name) ||
        "tool";
      const isError = data.isError === true || data.ok === false;
      push({
        label: isError ? `MCP tool call failed: ${toolName}` : `MCP tool call: ${toolName}`,
        explanation: isError
          ? "MCP callTool returned an error or timed out."
          : "Host issued MCP callTool across the client/server boundary.",
        detail: summarizeJson(data.preview ?? data),
        kind: isError ? "error" : "mcp",
        timestamp: start?.timestamp ?? event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    if (name === "mcp.server.request.received") {
      const key = event.mcpRequestId ?? `${event.timestamp}:srv:${i}`;
      openMcpServer.set(key, event);
      continue;
    }
    if (name === "mcp.server.tool.executed") {
      // Wait for response.sent when present; keep as open start.
      const key = event.mcpRequestId ?? "";
      if (key && !openMcpServer.has(key)) openMcpServer.set(key, event);
      continue;
    }
    if (name === "mcp.server.response.sent") {
      const key = event.mcpRequestId ?? "";
      const start = key ? openMcpServer.get(key) : undefined;
      if (key) openMcpServer.delete(key);
      const startData = asRecord(start?.data);
      const toolName =
        (typeof data.tool === "string" && data.tool) ||
        (typeof startData.tool === "string" && startData.tool) ||
        "tool";
      const ok = data.ok !== false && startData.ok !== false;
      push({
        label: ok ? `MCP server ran: ${toolName}` : `MCP server failed: ${toolName}`,
        explanation:
          "Server-side tool handler executed the CapabilitySet (direct domain-services or REST-backed).",
        detail: event.mcpRequestId
          ? `mcpRequestId=${event.mcpRequestId}${startData.backend ? ` · backend=${String(startData.backend)}` : ""}`
          : summarizeJson({ ...startData, ...data }),
        kind: ok ? "mcp" : "error",
        timestamp: start?.timestamp ?? event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    if (name === "mcp.resource.read") {
      const uri = typeof data.uri === "string" ? data.uri : "resource";
      push({
        label: `MCP resource read: ${uri}`,
        explanation:
          data.kind === "index"
            ? "Listed knowledge articles exposed as MCP resources."
            : "Read a knowledge article through the MCP resources API (not a tool call).",
        detail: summarizeJson(data),
        kind: "mcp",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name.startsWith("mcp.")) {
      push({
        label: name.replace(/^mcp\./, "MCP "),
        explanation: "Traffic crossed the MCP client/server boundary.",
        detail: summarizeJson(data),
        kind: "mcp",
        timestamp: event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    if (name === "a2a.agent.discovered") {
      const specialist =
        typeof data.specialist === "string"
          ? data.specialist
          : typeof data.name === "string"
            ? data.name
            : "specialist";
      push({
        label: `Discovered A2A agent: ${specialist}`,
        explanation: "Orchestrator loaded this specialist’s Agent Card (skills, URL, transport).",
        detail:
          typeof data.url === "string"
            ? data.url
            : typeof data.name === "string"
              ? String(data.name)
              : summarizeJson(data),
        kind: "a2a",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }

    if (name === "a2a.delegation.started") {
      const specialist =
        typeof data.specialist === "string" ? data.specialist : "specialist";
      // Prefer turn+specialist so orchestrator + specialist starts collapse even when SDK vs payload a2aTaskIds differ.
      const key =
        (event.turnId ? `${event.turnId}:${specialist}:start` : undefined) ??
        event.a2aTaskId ??
        `${event.timestamp}:dlg:${i}`;
      if (seenA2aStarts.has(key)) continue;
      seenA2aStarts.add(key);
      if (event.a2aTaskId) seenA2aStarts.add(event.a2aTaskId);
      push({
        label: `A2A → ${specialist} delegated`,
        explanation:
          "Parent sent a task to a specialist over A2A (Agent Card URL + sendMessage).",
        detail:
          typeof data.question === "string"
            ? clip(data.question, 280)
            : event.a2aTaskId
              ? `a2aTaskId=${event.a2aTaskId}`
              : summarizeJson(data),
        kind: "a2a",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }
    if (name === "a2a.task.created") {
      // Covered by delegation.started + specialist model/tool steps.
      continue;
    }
    if (name === "a2a.delegation.completed" || name === "a2a.task.completed") {
      const summary =
        typeof data.summary === "string"
          ? data.summary
          : typeof data.preview === "string"
            ? data.preview
            : undefined;
      // Specialist often logs a bare delegation.completed ack (ok only) after task.completed —
      // skip those so orch + specialist don't double-count when a2aTaskIds diverge.
      if (name === "a2a.delegation.completed" && summary === undefined) continue;

      const specialist =
        typeof data.specialist === "string" ? data.specialist : "specialist";
      const key =
        (event.turnId ? `${event.turnId}:${specialist}:done` : undefined) ??
        event.a2aTaskId ??
        `${event.timestamp}:done:${i}`;
      if (a2aCompletedTasks.has(key)) continue;
      a2aCompletedTasks.add(key);
      if (event.a2aTaskId) a2aCompletedTasks.add(event.a2aTaskId);

      const ok = data.ok !== false;
      push({
        label: ok
          ? `A2A → ${specialist} agent answered`
          : `A2A → ${specialist} agent failed`,
        explanation: ok
          ? "Specialist returned evidence over A2A (often after its own model + MCP tools)."
          : "Specialist delegation failed or returned an error payload.",
        detail: summary
          ? clip(summary, 280)
          : event.a2aTaskId
            ? `a2aTaskId=${event.a2aTaskId}`
            : summarizeJson(data),
        kind: ok ? "a2a" : "error",
        timestamp: event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }
    if (name === "a2a.task.failed") {
      const key = event.a2aTaskId ?? `${event.timestamp}:fail:${i}`;
      if (a2aCompletedTasks.has(key)) continue;
      a2aCompletedTasks.add(key);
      const specialist =
        typeof data.specialist === "string" ? data.specialist : "specialist";
      push({
        label: `A2A → ${specialist} agent failed`,
        explanation: "Specialist was unavailable, timed out, or threw during the A2A task.",
        detail:
          typeof data.error === "string"
            ? data.error
            : summarizeJson(data),
        kind: "error",
        timestamp: event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }
    if (name === "a2a.synthesis.completed") {
      push({
        label: "Orchestrator synthesized answer",
        explanation:
          "Parent agent combined specialist evidence into the user-facing reply (no domain MCP on the orchestrator).",
        detail: summarizeJson(data),
        kind: "a2a",
        timestamp: event.timestamp,
        event: name,
      });
      continue;
    }
    if (name.startsWith("a2a.")) {
      push({
        label: name.replace(/^a2a\./, "A2A "),
        explanation: "Work crossed an agent-to-agent (A2A) boundary.",
        detail: summarizeJson(data),
        kind: name.includes("failed") ? "error" : "a2a",
        timestamp: event.timestamp,
        durationMs: event.durationMs,
        event: name,
      });
      continue;
    }

    push({
      label: name,
      explanation: "Logged event.",
      detail: Object.keys(data).length ? summarizeJson(data) : undefined,
      kind: event.level === "ERROR" ? "error" : "other",
      timestamp: event.timestamp,
      durationMs: event.durationMs,
      event: name,
    });
  }

  for (const [, start] of openHttp) {
    const data = asRecord(start.data);
    push({
      label: `REST call started: ${httpLabel(data)}`,
      explanation: "Request was started but no completion event was logged.",
      kind: "http",
      timestamp: start.timestamp,
      event: "http.request.started",
    });
  }
  for (const [, start] of openModel) {
    push({
      label: "Model call started",
      explanation: "A model request was sent but no response was logged.",
      detail: summarizeJson(start.data),
      kind: "model",
      timestamp: start.timestamp,
      event: "model.requested",
    });
  }
  for (const [, open] of openTool) {
    const req = open.requested ?? open.started;
    if (!req) continue;
    const data = asRecord(req.data);
    push({
      label: `Tool started: ${typeof data.name === "string" ? data.name : "tool"}`,
      explanation: "Tool lifecycle did not log a completion event.",
      detail: summarizeJson(data),
      kind: "tool",
      timestamp: req.timestamp,
      event: req.event,
    });
  }
  for (const [, start] of openMcpTool) {
    const data = asRecord(start.data);
    push({
      label: `MCP tool call started: ${typeof data.name === "string" ? data.name : "tool"}`,
      explanation: "MCP callTool was requested but no completion was logged.",
      detail: summarizeJson(data),
      kind: "mcp",
      timestamp: start.timestamp,
      event: start.event,
    });
  }
  for (const [, start] of openMcpServer) {
    const data = asRecord(start.data);
    push({
      label: `MCP server request: ${typeof data.tool === "string" ? data.tool : "tool"}`,
      explanation: "Server received a tool request but did not log a response.",
      detail: summarizeJson(data),
      kind: "mcp",
      timestamp: start.timestamp,
      event: start.event,
    });
  }

  return nodes.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function formatTraceAscii(nodes: TraceNode[], title?: string): string {
  const lines: string[] = [];
  if (title) lines.push(title, "");
  if (nodes.length === 0) {
    lines.push("(no trace events)");
    return lines.join("\n");
  }

  nodes.forEach((node, index) => {
    const time = shortTime(node.timestamp);
    const dur = node.durationMs !== undefined ? ` (${node.durationMs}ms)` : "";
    const marker =
      node.kind === "decision"
        ? "?"
        : node.kind === "error"
          ? "x"
          : node.kind === "http"
            ? ">"
            : node.kind === "tool"
              ? "+"
              : node.kind === "user"
                ? ">"
                : node.kind === "assistant"
                  ? "<"
                  : node.kind === "mcp"
                    ? "m"
                    : node.kind === "a2a"
                      ? "a"
                      : node.kind === "model"
                        ? "~"
                        : "*";
    lines.push(`${time}  ${marker} ${node.label}${dur}`);
    if (node.explanation) {
      lines.push(`          why: ${node.explanation}`);
    }
    if (node.detail) {
      lines.push(`          └─ ${node.detail}`);
    }
    if (index < nodes.length - 1) {
      lines.push("          |");
    }
  });

  return lines.join("\n");
}

export function formatTraceHtml(nodes: TraceNode[], options: { title?: string; source?: string }): string {
  const title = options.title ?? "Northstar trace";
  const source = options.source ?? "";
  const items = nodes
    .map((node) => {
      const dur = node.durationMs !== undefined ? `<span class="dur">${node.durationMs}ms</span>` : "";
      const explanation = node.explanation
        ? `<div class="explanation">${escapeHtml(node.explanation)}</div>`
        : "";
      const detail = node.detail ? `<div class="detail">${escapeHtml(node.detail)}</div>` : "";
      return `<li class="node kind-${node.kind}">
  <div class="rail" aria-hidden="true"></div>
  <div class="card">
    <div class="meta"><time>${escapeHtml(shortTime(node.timestamp))}</time>${dur}<span class="kind">${escapeHtml(node.kind)}</span></div>
    <div class="label">${escapeHtml(node.label)}</div>
    ${explanation}
    ${detail}
  </div>
</li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font: 15px/1.45 "IBM Plex Sans", "Segoe UI", sans-serif; margin: 0; background: #f7f5f1; color: #1c1917; }
    header { padding: 1rem 1.5rem; background: #fff; border-bottom: 1px solid #d6d3d1; }
    h1 { margin: 0 0 0.25rem; font-size: 1.2rem; }
    .source { color: #78716c; font-size: 0.85rem; word-break: break-all; }
    ol { list-style: none; margin: 0; padding: 1.25rem 1.5rem 2rem; max-width: 52rem; }
    .node { display: grid; grid-template-columns: 1.25rem 1fr; gap: 0.75rem; position: relative; padding-bottom: 0.85rem; }
    .node:not(:last-child)::before { content: ""; position: absolute; left: 0.5rem; top: 1.1rem; bottom: 0; width: 2px; background: #d6d3d1; }
    .rail { width: 0.85rem; height: 0.85rem; margin-top: 0.55rem; border-radius: 999px; border: 2px solid #44403c; background: #fff; z-index: 1; }
    .card { background: #fff; border: 1px solid #d6d3d1; border-radius: 0.5rem; padding: 0.65rem 0.8rem; }
    .meta { display: flex; gap: 0.5rem; color: #78716c; font-size: 0.8rem; margin-bottom: 0.2rem; }
    .label { font-weight: 500; }
    .explanation { margin-top: 0.25rem; color: #57534e; font-size: 0.92rem; }
    .detail { margin-top: 0.35rem; color: #78716c; font-size: 0.88rem; white-space: pre-wrap; }
    .kind { text-transform: uppercase; letter-spacing: 0.04em; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    ${source ? `<div class="source">${escapeHtml(source)}</div>` : ""}
  </header>
  ${nodes.length === 0 ? `<p style="padding:2rem 1.5rem;color:#78716c">No trace events.</p>` : `<ol>${items}</ol>`}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
