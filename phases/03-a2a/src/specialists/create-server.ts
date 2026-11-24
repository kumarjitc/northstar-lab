import express from "express";
import { randomUUID } from "node:crypto";
import type { AgentCard, Message } from "@a2a-js/sdk";
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { createPhaseLogger, type JsonlLogger } from "@northstar/logger";
import type { ModelClient } from "@northstar/model-client";
import type { A2aConfig, SpecialistId } from "../config.js";
import { connectSpecialistMcp, type McpSession } from "../mcp/connect.js";
import type { DelegationRequest } from "../shared/types.js";
import { buildAgentCard } from "./cards.js";
import { runSpecialistTurn } from "./run-turn.js";

export type SpecialistRuntime = {
  id: SpecialistId;
  card: AgentCard;
  port: number;
  logger: JsonlLogger;
  mcp: McpSession;
  close: () => Promise<void>;
  /** Underlying http.Server close */
  stopHttp: () => Promise<void>;
};

function parseDelegation(text: string, fallbackTaskId: string, specialist: SpecialistId): DelegationRequest {
  try {
    const parsed = JSON.parse(text) as Partial<DelegationRequest>;
    if (parsed && typeof parsed.question === "string") {
      return {
        a2aTaskId: parsed.a2aTaskId || fallbackTaskId,
        specialist,
        customerId: parsed.customerId,
        question: parsed.question,
        knownFacts: parsed.knownFacts,
        correlation: parsed.correlation ?? {
          runId: "run_unknown",
          sessionId: "session_unknown",
          turnId: "turn_unknown",
        },
      };
    }
  } catch {
    // fall through — treat raw text as question
  }
  return {
    a2aTaskId: fallbackTaskId,
    specialist,
    question: text,
    correlation: {
      runId: "run_unknown",
      sessionId: "session_unknown",
      turnId: "turn_unknown",
    },
  };
}

export async function startSpecialistServer(options: {
  id: SpecialistId;
  config: A2aConfig;
  model: ModelClient;
  runId?: string;
}): Promise<SpecialistRuntime> {
  const { id, config, model } = options;
  const logger = createPhaseLogger({
    phase: "03-a2a",
    component: `${id}-agent`,
    logDir: config.logDir,
    runId: options.runId,
    fileName: options.runId
      ? `${options.runId}.${id}.jsonl`
      : undefined,
    runStartedData: {
      role: "specialist",
      specialist: id,
      a2aCapabilityBackend: config.capabilityBackend,
      port: config.ports[id],
    },
  });

  logger.log("capability.backend.selected", {
    capabilityBackend: config.capabilityBackend,
    mcpToolBackend: config.mcpToolBackend,
    specialist: id,
  });

  const mcp = await connectSpecialistMcp({
    config,
    logger,
    specialist: id,
    logFileSuffix: `${logger.runId}.${id}.mcp-server.jsonl`,
  });

  const card = buildAgentCard(config, id);

  const executor: AgentExecutor = {
    async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
      const userText =
        requestContext.userMessage.parts
          ?.map((p) => (p.kind === "text" ? p.text : JSON.stringify(p)))
          .join("\n") ?? "";

      const fallbackTaskId = requestContext.taskId || `a2a_${randomUUID()}`;
      const request = parseDelegation(userText, fallbackTaskId, id);
      // Prefer the orchestrator-issued id from the delegation payload so orch + specialist logs share a2aTaskId.
      const a2aTaskId = request.a2aTaskId;

      logger.log(
        "a2a.delegation.started",
        { specialist: id, a2aTaskId, question: request.question },
        {
          a2aTaskId,
          runId: request.correlation.runId,
          sessionId: request.correlation.sessionId,
          turnId: request.correlation.turnId,
        },
      );

      try {
        const evidence = await runSpecialistTurn({
          specialist: id,
          request,
          model,
          mcp,
          logger,
          maxIterations: config.maxIterations,
          mcpCallTimeoutMs: config.mcpCallTimeoutMs,
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
          { specialist: id, ok: evidence.ok },
          { a2aTaskId, runId: request.correlation.runId },
        );
        eventBus.finished();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(
          "a2a.task.failed",
          { specialist: id, error: message },
          { a2aTaskId, level: "ERROR" },
        );
        const responseMessage: Message = {
          kind: "message",
          messageId: randomUUID(),
          role: "agent",
          parts: [
            {
              kind: "text",
              text: JSON.stringify({
                specialist: id,
                a2aTaskId,
                ok: false,
                summary: "",
                error: message,
              }),
            },
          ],
          contextId: requestContext.contextId,
        };
        eventBus.publish(responseMessage);
        eventBus.finished();
      }
    },
    cancelTask: async () => {},
  };

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  const app = new A2AExpressApp(requestHandler).setupRoutes(express());
  const port = config.ports[id];

  const server = await new Promise<import("node:http").Server>((resolve, reject) => {
    const s = app.listen(port, config.host, () => resolve(s));
    s.on("error", reject);
  });

  console.error(
    `[${id}-agent] listening on http://${config.host}:${port} · backend=${config.capabilityBackend} · log=${logger.filePath}`,
  );

  return {
    id,
    card,
    port,
    logger,
    mcp,
    close: async () => {
      await mcp.close();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    stopHttp: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
