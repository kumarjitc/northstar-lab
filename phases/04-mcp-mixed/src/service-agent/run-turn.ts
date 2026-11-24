import { randomUUID } from "node:crypto";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { JsonlLogger } from "@northstar/logger";
import type { ChatMessage, ModelClient } from "@northstar/model-client";
import type { ServiceDelegationEvidence, ServiceDelegationRequest } from "../shared/types.js";
import { createServiceDirectTools } from "./tools.js";

const SYSTEM = `You are the Northstar Service specialist agent.
You receive a focused delegation JSON. Use your direct tools for services, faults, incidents, and orders.
Return a concise evidence summary — not a chat script. Never invent record IDs.
Passing line tests with BLOCKED access usually means billing/access restriction, not a physical fault.
Do not promise reconnection.`;

export async function runServiceAgentTurn(options: {
  request: ServiceDelegationRequest;
  model: ModelClient;
  capabilities: CapabilitySet;
  logger: JsonlLogger;
  maxIterations: number;
}): Promise<ServiceDelegationEvidence> {
  const { request, model, capabilities, logger } = options;
  const tools = createServiceDirectTools();
  const toolDefs = tools.map((t) => t.definition);
  const byName = new Map(tools.map((t) => [t.name, t]));

  const ids = {
    runId: request.correlation.runId,
    sessionId: request.correlation.sessionId,
    turnId: request.correlation.turnId,
    a2aTaskId: request.a2aTaskId,
  };

  logger.log(
    "a2a.task.created",
    { specialist: "service", question: request.question, customerId: request.customerId },
    ids,
  );

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `Delegation request (JSON):\n${JSON.stringify(request, null, 2)}\n\n` +
        `Respond with a clear evidence summary for the host agent.`,
    },
  ];

  const toolNamesUsed: string[] = [];
  let iterations = 0;
  let finalText = "";

  while (iterations < options.maxIterations) {
    iterations += 1;
    const modelStarted = Date.now();
    logger.log(
      "model.requested",
      { iteration: iterations, specialist: "service", toolCount: toolDefs.length },
      { ...ids, modelCallId: `model_${iterations}` },
    );

    const response = await model.complete({
      messages,
      tools: toolDefs,
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
      const tool = byName.get(call.name);
      let args: unknown = {};
      try {
        args = JSON.parse(call.argumentsJson || "{}");
      } catch {
        args = {};
      }

      logger.log(
        "tool.requested",
        { name: call.name, via: "direct" },
        { ...ids, toolCallId },
      );
      const started = Date.now();
      try {
        if (!tool) throw new Error(`Unknown tool ${call.name}`);
        const parsed = tool.inputSchema.parse(args);
        const result = await tool.execute(parsed, capabilities);
        logger.log(
          "tool.completed",
          { name: call.name, via: "direct", preview: JSON.stringify(result).slice(0, 400) },
          { ...ids, toolCallId, durationMs: Date.now() - started },
        );
        messages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(
          "tool.failed",
          { name: call.name, error: message },
          { ...ids, toolCallId, durationMs: Date.now() - started, level: "ERROR" },
        );
        messages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify({ ok: false, error: { message } }),
        });
      }
    }
  }

  if (!finalText) {
    finalText =
      "Service agent reached the tool-iteration limit before finishing. Evidence may be incomplete.";
  }

  const evidence: ServiceDelegationEvidence = {
    specialist: "service",
    a2aTaskId: request.a2aTaskId,
    ok: true,
    summary: finalText,
    recordIds: extractRecordIds(finalText),
    caveats: toolNamesUsed.length
      ? [`tools_used=${toolNamesUsed.join(",")}`, "backend=direct"]
      : ["no_tools_used", "backend=direct"],
  };
  logger.log("a2a.task.completed", evidence, ids);
  return evidence;
}

function extractRecordIds(text: string): string[] {
  const matches = text.match(/\b(?:CUST|BA|BILL|PAY|BC|FLT|SVC|ORD|CON|OFF)-\d+\b/g);
  return matches ? [...new Set(matches)] : [];
}
