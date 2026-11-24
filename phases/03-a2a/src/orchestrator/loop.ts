import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { JsonlLogger } from "@northstar/logger";
import type { ModelClient, ToolDefinition } from "@northstar/model-client";
import type { A2aConfig, SpecialistId } from "../config.js";
import type { DelegationEvidence } from "../shared/types.js";
import {
  delegateToSpecialist,
  type SpecialistClients,
} from "./delegation.js";
import type { OrchestratorSession } from "./session.js";

const DELEGATION_TOOLS: ToolDefinition[] = [
  {
    name: "delegate_billing",
    description:
      "Ask the Billing Agent (A2A) for bills, balances, payments, or dispute evidence. Pass customerId when known.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        customerId: { type: "string" },
        knownFacts: { type: "object", additionalProperties: { type: "string" } },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "delegate_service",
    description:
      "Ask the Service Agent (A2A) for services, faults, incidents, or order/activation evidence.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        customerId: { type: "string" },
        knownFacts: { type: "object", additionalProperties: { type: "string" } },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "delegate_contract",
    description:
      "Ask the Contract Agent (A2A) for contract status, events, offers, or contractual interpretation.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        customerId: { type: "string" },
        knownFacts: { type: "object", additionalProperties: { type: "string" } },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
];

const ArgsSchema = z.object({
  question: z.string(),
  customerId: z.string().optional(),
  knownFacts: z.record(z.string()).optional(),
});

export type OrchestratorTurnResult = {
  turnId: string;
  assistantText: string;
  iterations: number;
  delegations: DelegationEvidence[];
  timedOut: boolean;
  hitIterationLimit: boolean;
};

function toolNameToSpecialist(name: string): SpecialistId | null {
  if (name === "delegate_billing") return "billing";
  if (name === "delegate_service") return "service";
  if (name === "delegate_contract") return "contract";
  return null;
}

export async function runOrchestratorTurn(
  session: OrchestratorSession,
  userText: string,
  options: {
    model: ModelClient;
    clients: SpecialistClients;
    config: A2aConfig;
    logger: JsonlLogger;
  },
): Promise<OrchestratorTurnResult> {
  const turnId = `turn_${randomUUID()}`;
  const ids = {
    runId: options.logger.runId,
    sessionId: session.sessionId,
    turnId,
  };

  options.logger.log("user.message.received", { text: userText }, ids);
  session.messages.push({ role: "user", content: userText });
  session.turnCount += 1;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.config.turnTimeoutMs);
  const delegations: DelegationEvidence[] = [];
  let iterations = 0;
  let timedOut = false;
  let hitIterationLimit = false;
  let assistantText = "";

  try {
    while (iterations < options.config.maxIterations) {
      iterations += 1;
      if (controller.signal.aborted) {
        timedOut = true;
        break;
      }

      const modelStarted = Date.now();
      options.logger.log(
        "model.requested",
        { iteration: iterations, toolCount: DELEGATION_TOOLS.length, role: "orchestrator" },
        { ...ids, modelCallId: `model_${iterations}` },
      );

      let response;
      try {
        response = await options.model.complete(
          {
            messages: session.messages,
            tools: DELEGATION_TOOLS,
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
        assistantText = response.content?.trim() || "(No response from orchestrator.)";
        session.messages.push({ role: "assistant", content: assistantText });
        options.logger.log(
          "a2a.synthesis.completed",
          { delegations: delegations.length, final: true },
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
        const toolCallId = call.id || `tool_${randomUUID()}`;
        const specialist = toolNameToSpecialist(call.name);
        if (!specialist) {
          const payload = {
            ok: false,
            error: { message: `Unknown orchestrator tool: ${call.name}` },
          };
          session.messages.push({
            role: "tool",
            tool_call_id: toolCallId,
            content: JSON.stringify(payload),
          });
          continue;
        }

        let parsed: z.infer<typeof ArgsSchema>;
        try {
          parsed = ArgsSchema.parse(JSON.parse(call.argumentsJson || "{}"));
        } catch (error) {
          const payload = {
            ok: false,
            error: {
              message: "Invalid delegation arguments",
              details: error instanceof Error ? error.message : String(error),
            },
          };
          session.messages.push({
            role: "tool",
            tool_call_id: toolCallId,
            content: JSON.stringify(payload),
          });
          continue;
        }

        const evidence = await delegateToSpecialist({
          specialist,
          clients: options.clients,
          config: options.config,
          logger: options.logger,
          request: {
            question: parsed.question,
            customerId: parsed.customerId,
            knownFacts: parsed.knownFacts,
            correlation: {
              runId: options.logger.runId,
              sessionId: session.sessionId,
              turnId,
            },
          },
        });
        delegations.push(evidence);
        session.messages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify(evidence),
        });
      }

      if (iterations >= options.config.maxIterations) {
        hitIterationLimit = true;
        assistantText =
          "I reached the orchestration iteration limit before finishing. Please narrow the question.";
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
    {
      text: assistantText,
      delegations: delegations.map((d) => d.specialist),
      iterations,
      timedOut,
      hitIterationLimit,
    },
    ids,
  );

  return {
    turnId,
    assistantText,
    iterations,
    delegations,
    timedOut,
    hitIterationLimit,
  };
}
