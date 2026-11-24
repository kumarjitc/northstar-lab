import { randomUUID } from "node:crypto";
import type { JsonlLogger } from "@northstar/logger";
import type { ChatMessage, ModelClient } from "@northstar/model-client";
import { callMcpTool, type McpSession } from "../mcp/connect.js";
import type { DelegationRequest, DelegationEvidence } from "../shared/types.js";
import type { SpecialistId } from "../config.js";
import { SPECIALIST_PROMPTS } from "./prompts.js";

export async function runSpecialistTurn(options: {
  specialist: SpecialistId;
  request: DelegationRequest;
  model: ModelClient;
  mcp: McpSession;
  logger: JsonlLogger;
  maxIterations: number;
  mcpCallTimeoutMs: number;
}): Promise<DelegationEvidence> {
  const { specialist, request, model, mcp, logger } = options;
  const ids = {
    runId: request.correlation.runId,
    sessionId: request.correlation.sessionId,
    turnId: request.correlation.turnId,
    a2aTaskId: request.a2aTaskId,
  };

  const messages: ChatMessage[] = [
    { role: "system", content: SPECIALIST_PROMPTS[specialist] },
    {
      role: "user",
      content:
        `Delegation request (JSON):\n${JSON.stringify(request, null, 2)}\n\n` +
        `Respond with a clear evidence summary for the orchestrator. Prefer citing tool-backed facts.`,
    },
  ];

  logger.log(
    "a2a.task.created",
    { specialist, question: request.question, customerId: request.customerId },
    ids,
  );

  const toolNamesUsed: string[] = [];
  let iterations = 0;
  let finalText = "";

  while (iterations < options.maxIterations) {
    iterations += 1;
    const modelStarted = Date.now();
    logger.log(
      "model.requested",
      { iteration: iterations, specialist, toolCount: mcp.tools.length },
      { ...ids, modelCallId: `model_${iterations}` },
    );

    const response = await model.complete({
      messages,
      tools: mcp.tools,
      temperature: 0,
    });

    logger.log(
      "model.responded",
      {
        iteration: iterations,
        content: response.content,
        toolCalls: response.toolCalls.map((c) => ({ id: c.id, name: c.name })),
      },
      { ...ids, modelCallId: `model_${iterations}`, durationMs: Date.now() - modelStarted },
    );

    if (!response.toolCalls.length) {
      finalText = response.content?.trim() || "(No specialist content.)";
      break;
    }

    messages.push({
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
      const toolCallId = call.id || `tool_${randomUUID()}`;
      const mcpRequestId = `mcp_${randomUUID()}`;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.argumentsJson || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      const result = await callMcpTool(mcp, {
        name: call.name,
        args,
        logger,
        mcpRequestId,
        timeoutMs: options.mcpCallTimeoutMs,
        ids: { ...ids, toolCallId },
      });
      messages.push({
        role: "tool",
        tool_call_id: toolCallId,
        content: result.content,
      });
    }
  }

  if (!finalText) {
    finalText =
      "Specialist reached the tool-iteration limit before finishing. Evidence may be incomplete.";
  }

  const evidence: DelegationEvidence = {
    specialist,
    a2aTaskId: request.a2aTaskId,
    ok: true,
    summary: finalText,
    recordIds: extractRecordIds(finalText),
    caveats: toolNamesUsed.length
      ? [`tools_used=${toolNamesUsed.join(",")}`]
      : ["no_tools_used"],
  };

  logger.log("a2a.task.completed", evidence, ids);
  return evidence;
}

function extractRecordIds(text: string): string[] {
  const matches = text.match(/\b(?:CUST|BA|BILL|PAY|BC|FLT|SVC|ORD|CON|OFF)-\d+\b/g);
  return matches ? [...new Set(matches)] : [];
}
