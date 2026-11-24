import express from "express";
import { randomUUID } from "node:crypto";
import type { Message } from "@a2a-js/sdk";
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import type { CapabilitySet } from "@northstar/capability-contracts";
import { createPhaseLogger, type JsonlLogger } from "@northstar/logger";
import type { ModelClient } from "@northstar/model-client";
import type { MixedConfig } from "../config.js";
import { createServiceDirectCapabilities } from "../backends/factory.js";
import type { ServiceDelegationRequest } from "../shared/types.js";
import { buildServiceAgentCard } from "./cards.js";
import { runServiceAgentTurn } from "./run-turn.js";

export type ServiceAgentRuntime = {
  logger: JsonlLogger;
  port: number;
  close: () => Promise<void>;
};

function parseDelegation(text: string, fallbackTaskId: string): ServiceDelegationRequest {
  try {
    const parsed = JSON.parse(text) as Partial<ServiceDelegationRequest>;
    if (parsed && typeof parsed.question === "string") {
      return {
        a2aTaskId: parsed.a2aTaskId || fallbackTaskId,
        customerId: parsed.customerId,
        question: parsed.question,
        correlation: parsed.correlation ?? {
          runId: "run_unknown",
          sessionId: "session_unknown",
          turnId: "turn_unknown",
        },
      };
    }
  } catch {
    // fall through
  }
  return {
    a2aTaskId: fallbackTaskId,
    question: text,
    correlation: {
      runId: "run_unknown",
      sessionId: "session_unknown",
      turnId: "turn_unknown",
    },
  };
}

export async function startServiceAgent(options: {
  config: MixedConfig;
  model: ModelClient;
  runId?: string;
  capabilities?: CapabilitySet;
}): Promise<ServiceAgentRuntime> {
  const { config, model } = options;
  const logger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "service-agent",
    logDir: config.logDir,
    runId: options.runId,
    fileName: options.runId ? `${options.runId}.service.jsonl` : undefined,
    runStartedData: {
      role: "service-agent",
      toolBackend: "direct",
      port: config.servicePort,
    },
  });

  logger.log("capability.backend.selected", {
    domain: "service",
    transport: "a2a",
    toolBackend: "direct",
  });

  const capabilities = options.capabilities ?? createServiceDirectCapabilities(config);
  const card = buildServiceAgentCard(config);

  const executor: AgentExecutor = {
    async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
      const userText =
        requestContext.userMessage.parts
          ?.map((p) => (p.kind === "text" ? p.text : JSON.stringify(p)))
          .join("\n") ?? "";

      const fallbackTaskId = requestContext.taskId || `a2a_${randomUUID()}`;
      const request = parseDelegation(userText, fallbackTaskId);
      const a2aTaskId = request.a2aTaskId;

      logger.log(
        "a2a.delegation.started",
        { specialist: "service", a2aTaskId, question: request.question },
        {
          a2aTaskId,
          runId: request.correlation.runId,
          sessionId: request.correlation.sessionId,
          turnId: request.correlation.turnId,
        },
      );

      try {
        const evidence = await runServiceAgentTurn({
          request,
          model,
          capabilities,
          logger,
          maxIterations: config.maxIterations,
        });
        const responseMessage: Message = {
          kind: "message",
          messageId: randomUUID(),
          role: "agent",
          parts: [{ kind: "text", text: JSON.stringify(evidence) }],
          contextId: requestContext.contextId,
        };
        eventBus.publish(responseMessage);
        logger.log(
          "a2a.delegation.completed",
          { specialist: "service", ok: evidence.ok },
          { a2aTaskId, runId: request.correlation.runId },
        );
        eventBus.finished();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(
          "a2a.task.failed",
          { specialist: "service", error: message },
          { a2aTaskId, level: "ERROR" },
        );
        eventBus.publish({
          kind: "message",
          messageId: randomUUID(),
          role: "agent",
          parts: [
            {
              kind: "text",
              text: JSON.stringify({
                specialist: "service",
                a2aTaskId,
                ok: false,
                summary: "",
                error: message,
              }),
            },
          ],
          contextId: requestContext.contextId,
        } satisfies Message);
        eventBus.finished();
      }
    },
    cancelTask: async () => {},
  };

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  const app = new A2AExpressApp(requestHandler).setupRoutes(express());

  const server = await new Promise<import("node:http").Server>((resolve, reject) => {
    const s = app.listen(config.servicePort, config.serviceHost, () => resolve(s));
    s.on("error", reject);
  });

  console.error(
    `[service-agent] listening on http://${config.serviceHost}:${config.servicePort} · tools=direct · log=${logger.filePath}`,
  );

  let closed = false;
  return {
    logger,
    port: config.servicePort,
    close: async () => {
      if (closed) return;
      closed = true;
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          // Node may report "Server is not running" if already closed.
          if (err && !/not running/i.test(err.message)) reject(err);
          else resolve();
        });
      });
    },
  };
}
