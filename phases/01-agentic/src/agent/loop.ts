import { randomUUID } from "node:crypto";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { JsonlLogger } from "@northstar/logger";
import type { ChatMessage, ModelClient, ToolCallRequest } from "@northstar/model-client";
import {
  createToolRegistry,
  getToolMap,
  toolsAsModelDefinitions,
  type AgentTool,
} from "../tools/registry.js";
import type { SessionState } from "./session.js";

export type AgentLoopOptions = {
  model: ModelClient;
  capabilities: CapabilitySet;
  logger: JsonlLogger;
  maxIterations: number;
  turnTimeoutMs: number;
  tools?: AgentTool[];
};

export type AgentTurnResult = {
  turnId: string;
  assistantText: string;
  iterations: number;
  toolNamesUsed: string[];
  timedOut: boolean;
  hitIterationLimit: boolean;
};

async function executeToolCall(
  call: ToolCallRequest,
  toolMap: Map<string, AgentTool>,
  capabilities: CapabilitySet,
  logger: JsonlLogger,
  ids: { runId: string; sessionId: string; turnId: string },
): Promise<{ tool_call_id: string; content: string }> {
  const toolCallId = call.id || `tool_${randomUUID()}`;
  logger.log(
    "tool.requested",
    { name: call.name, argumentsJson: call.argumentsJson },
    { ...ids, toolCallId },
  );

  const tool = toolMap.get(call.name);
  if (!tool) {
    const payload = {
      ok: false,
      error: { code: "INVALID_INPUT", message: `Unknown tool: ${call.name}` },
    };
    logger.log("tool.failed", payload, { ...ids, toolCallId, level: "WARN" });
    return { tool_call_id: toolCallId, content: JSON.stringify(payload) };
  }

  let parsedArgs: unknown;
  try {
    parsedArgs = JSON.parse(call.argumentsJson || "{}");
  } catch {
    const payload = {
      ok: false,
      error: { code: "INVALID_INPUT", message: "Tool arguments were not valid JSON" },
    };
    logger.log("tool.failed", payload, { ...ids, toolCallId, level: "WARN" });
    return { tool_call_id: toolCallId, content: JSON.stringify(payload) };
  }

  const validated = tool.inputSchema.safeParse(parsedArgs);
  if (!validated.success) {
    const payload = {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Tool arguments failed schema validation",
        details: validated.error.flatten(),
      },
    };
    logger.log("tool.failed", payload, { ...ids, toolCallId, level: "WARN" });
    return { tool_call_id: toolCallId, content: JSON.stringify(payload) };
  }

  const started = Date.now();
  logger.log("tool.started", { name: tool.name, kind: tool.kind }, { ...ids, toolCallId });
  try {
    const result = await tool.execute(validated.data, capabilities);
    logger.log(
      "tool.completed",
      { name: tool.name, result },
      { ...ids, toolCallId, durationMs: Date.now() - started },
    );
    return { tool_call_id: toolCallId, content: JSON.stringify(result) };
  } catch (error) {
    const payload = {
      ok: false,
      error: {
        code: "INTERNAL",
        message: error instanceof Error ? error.message : String(error),
      },
    };
    logger.log(
      "tool.failed",
      payload,
      { ...ids, toolCallId, durationMs: Date.now() - started, level: "ERROR" },
    );
    return { tool_call_id: toolCallId, content: JSON.stringify(payload) };
  }
}

export async function runAgentTurn(
  session: SessionState,
  userText: string,
  options: AgentLoopOptions,
): Promise<AgentTurnResult> {
  const turnId = `turn_${randomUUID()}`;
  const tools = options.tools ?? createToolRegistry();
  const toolMap = getToolMap(tools);
  const toolDefs = toolsAsModelDefinitions(tools);
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

      // Execute tool calls sequentially for clear traces; reads remain independently safe.
      for (const call of response.toolCalls) {
        toolNamesUsed.push(call.name);
        const result = await executeToolCall(call, toolMap, options.capabilities, options.logger, ids);
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
