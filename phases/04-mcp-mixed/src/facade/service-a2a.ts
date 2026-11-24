import { randomUUID } from "node:crypto";
import { A2AClient } from "@a2a-js/sdk/client";
import type { Message } from "@a2a-js/sdk";
import type { JsonlLogger } from "@northstar/logger";
import type { MixedConfig } from "../config.js";
import { serviceCardUrl } from "../config.js";
import type { ServiceDelegationEvidence, ServiceDelegationRequest } from "../shared/types.js";

export async function discoverServiceAgent(
  config: MixedConfig,
  logger: JsonlLogger,
): Promise<A2AClient> {
  const cardUrl = serviceCardUrl(config);
  const client = await A2AClient.fromCardUrl(cardUrl);
  const card = await client.getAgentCard();
  logger.log("a2a.agent.discovered", {
    specialist: "service",
    name: card.name,
    url: card.url,
    skills: card.skills?.map((s) => s.id),
  });
  return client;
}

function extractText(result: unknown): string {
  if (!result || typeof result !== "object") return String(result);
  const r = result as {
    error?: { message?: string };
    result?: unknown;
    kind?: string;
    parts?: Array<{ kind?: string; text?: string }>;
    status?: { message?: Message };
  };
  if ("error" in r && r.error) {
    throw new Error(r.error.message ?? "A2A sendMessage error");
  }
  const payload = "result" in r ? r.result : r;
  if (!payload || typeof payload !== "object") return String(payload);
  const msg = payload as Message & { status?: { message?: Message } };
  if (msg.kind === "message" && Array.isArray(msg.parts)) {
    return msg.parts.map((p) => (p.kind === "text" ? p.text ?? "" : "")).join("\n");
  }
  if ((msg as { kind?: string }).kind === "task" && msg.status?.message?.parts) {
    return msg.status.message.parts
      .map((p) => (p.kind === "text" ? p.text ?? "" : ""))
      .join("\n");
  }
  return JSON.stringify(payload);
}

export async function askServiceAgent(options: {
  client: A2AClient;
  config: MixedConfig;
  logger: JsonlLogger;
  question: string;
  customerId?: string;
  correlation: ServiceDelegationRequest["correlation"];
}): Promise<ServiceDelegationEvidence> {
  const a2aTaskId = `a2a_${randomUUID()}`;
  const request: ServiceDelegationRequest = {
    a2aTaskId,
    question: options.question,
    customerId: options.customerId,
    correlation: options.correlation,
  };
  const ids = { ...options.correlation, a2aTaskId };

  options.logger.log(
    "a2a.delegation.started",
    { specialist: "service", question: options.question, customerId: options.customerId },
    ids,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.config.a2aTimeoutMs);
  const started = Date.now();

  try {
    const response = await options.client.sendMessage({
      message: {
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: JSON.stringify(request) }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain", "application/json"],
      },
    });

    const text = extractText(response);
    let evidence: ServiceDelegationEvidence;
    try {
      evidence = JSON.parse(text) as ServiceDelegationEvidence;
    } catch {
      evidence = {
        specialist: "service",
        a2aTaskId,
        ok: true,
        summary: text,
      };
    }

    options.logger.log(
      "a2a.delegation.completed",
      {
        specialist: "service",
        ok: evidence.ok !== false,
        preview: (evidence.summary ?? "").slice(0, 300),
      },
      { ...ids, durationMs: Date.now() - started },
    );
    return evidence;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const evidence: ServiceDelegationEvidence = {
      specialist: "service",
      a2aTaskId,
      ok: false,
      summary: "",
      error: message,
    };
    options.logger.log("a2a.task.failed", evidence, {
      ...ids,
      durationMs: Date.now() - started,
      level: "ERROR",
    });
    return evidence;
  } finally {
    clearTimeout(timer);
  }
}
