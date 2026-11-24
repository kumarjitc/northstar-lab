import { randomUUID } from "node:crypto";
import type { JsonlLogger } from "@northstar/logger";
import type { ModelClient, ToolCallRequest } from "@northstar/model-client";
import { callMcpTool, type McpHostSession } from "./mcp-session.js";
import type { SessionState } from "./session.js";

export type AgentLoopOptions = {
  model: ModelClient;
  mcp: McpHostSession;
  logger: JsonlLogger;
  maxIterations: number;
  turnTimeoutMs: number;
  mcpCallTimeoutMs: number;
};

export type AgentTurnResult = {
  turnId: string;
  assistantText: string;
  iterations: number;
  toolNamesUsed: string[];
  timedOut: boolean;
  hitIterationLimit: boolean;
};

export async function runAgentTurn(
  session: SessionState,
  userText: string,
  options: AgentLoopOptions,
): Promise<AgentTurnResult> {
  const turnId = `turn_${randomUUID()}`;
  const toolDefs = options.mcp.tools;
  const ids = {
    runId: options.logger.runId,
    sessionId: session.sessionId,
    turnId,
  };

  options.logger.log("user.message.received", { text: userText }, ids);
  session.messages.push({ role: "user", content: userText });
  session.turnCount += 1;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.turnTimeoutMs);
  const toolNamesUsed: string[] = [];
  let iterations = 0;
  let timedOut = false;
  let hitIterationLimit = false;
  let assistantText = "";

  try {
    while (iterations < options.maxIterations) {
      iterations += 1;
      if (controller.signal.aborted) {
        timedOut = true;
        break;
      }

      const modelStarted = Date.now();
      options.logger.log(
        "model.requested",
        { iteration: iterations, messageCount: session.messages.length, toolCount: toolDefs.length },
        { ...ids, modelCallId: `model_${iterations}` },
      );

      let response;
      try {
        response = await options.model.complete(
          {
            messages: session.messages,
            tools: toolDefs,
            temperature: 0,
          },
          controller.signal,
        );
      } catch (error) {
        if (controller.signal.aborted) {
          timedOut = true;
          break;
        }
        throw error;
      }

      options.logger.log(
        "model.responded",
        {
          iteration: iterations,
          content: response.content,
          toolCalls: response.toolCalls.map((c) => ({ id: c.id, name: c.name })),
        },
        {
          ...ids,
          modelCallId: `model_${iterations}`,
          durationMs: Date.now() - modelStarted,
        },
      );

      if (!response.toolCalls.length) {
        assistantText = response.content?.trim() || "(No response content from model.)";
        session.messages.push({ role: "assistant", content: assistantText });
        options.logger.log(
          "agent.iteration.completed",
          { iteration: iterations, final: true },
          ids,
        );
        break;
      }

      session.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls.map((c) => ({
          id: c.id,
          type: "function" as const,
          function: { name: c.name, arguments: c.argumentsJson },
        })),
      });

      for (const call of response.toolCalls) {
        toolNamesUsed.push(call.name);
        const result = await executeMcpToolCall(call, options, ids);
        session.messages.push({
          role: "tool",
          tool_call_id: result.tool_call_id,
          content: result.content,
        });
      }

      options.logger.log(
        "agent.iteration.completed",
        { iteration: iterations, final: false, tools: response.toolCalls.map((c) => c.name) },
        ids,
      );

      if (iterations >= options.maxIterations) {
        hitIterationLimit = true;
        assistantText =
          "I reached the tool-iteration limit before finishing. Please narrow the question or continue in a new turn.";
        session.messages.push({ role: "assistant", content: assistantText });
      }
    }
  } finally {
    clearTimeout(timer);
  }

  if (timedOut && !assistantText) {
    assistantText = "This turn timed out before a complete answer was available.";
    session.messages.push({ role: "assistant", content: assistantText });
  }

  options.logger.log(
    "assistant.response.sent",
    { text: assistantText, toolNamesUsed, iterations, timedOut, hitIterationLimit },
    ids,
  );

  return {
    turnId,
    assistantText,
    iterations,
    toolNamesUsed,
    timedOut,
    hitIterationLimit,
  };
}

async function executeMcpToolCall(
  call: ToolCallRequest,
  options: AgentLoopOptions,
  ids: { runId: string; sessionId: string; turnId: string },
): Promise<{ tool_call_id: string; content: string }> {
  const toolCallId = call.id || `tool_${randomUUID()}`;
  const mcpRequestId = `mcp_${randomUUID()}`;

  options.logger.log(
    "tool.requested",
    { name: call.name, argumentsJson: call.argumentsJson, via: "mcp" },
    { ...ids, toolCallId, mcpRequestId },
  );

  const known = options.mcp.tools.some((t) => t.name === call.name);
  if (!known) {
    const payload = {
      ok: false,
      error: { code: "INVALID_INPUT", message: `Unknown MCP tool: ${call.name}` },
    };
    options.logger.log("tool.failed", payload, {
      ...ids,
      toolCallId,
      mcpRequestId,
      level: "WARN",
    });
    return { tool_call_id: toolCallId, content: JSON.stringify(payload) };
  }

  const started = Date.now();
  options.logger.log(
    "tool.started",
    { name: call.name, via: "mcp" },
    { ...ids, toolCallId, mcpRequestId },
  );

  const result = await callMcpTool(options.mcp, {
    name: call.name,
    argumentsJson: call.argumentsJson,
    logger: options.logger,
    mcpRequestId,
    timeoutMs: options.mcpCallTimeoutMs,
    ids: { ...ids, toolCallId },
  });

  options.logger.log(
    result.isError ? "tool.failed" : "tool.completed",
    { name: call.name, via: "mcp", preview: result.content.slice(0, 500) },
    {
      ...ids,
      toolCallId,
      mcpRequestId,
      durationMs: Date.now() - started,
      level: result.isError ? "WARN" : "INFO",
    },
  );

  return { tool_call_id: toolCallId, content: result.content };
}
