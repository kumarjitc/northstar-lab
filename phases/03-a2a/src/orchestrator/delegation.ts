import { randomUUID } from "node:crypto";
import { A2AClient } from "@a2a-js/sdk/client";
import type { Message } from "@a2a-js/sdk";
import type { JsonlLogger } from "@northstar/logger";
import type { A2aConfig, SpecialistId } from "../config.js";
import { specialistCardUrl } from "../config.js";
import type { DelegationEvidence, DelegationRequest } from "../shared/types.js";

export type SpecialistClients = Record<SpecialistId, A2AClient>;

export async function discoverSpecialists(
  config: A2aConfig,
  logger: JsonlLogger,
): Promise<SpecialistClients> {
  const ids: SpecialistId[] = ["billing", "service", "contract"];
  const clients = {} as SpecialistClients;

  for (const id of ids) {
    const cardUrl = specialistCardUrl(config, id);
    try {
      const client = await A2AClient.fromCardUrl(cardUrl);
      clients[id] = client;
      const card = await client.getAgentCard();
      logger.log("a2a.agent.discovered", {
        specialist: id,
        name: card.name,
        url: card.url,
        skills: card.skills?.map((s) => s.id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to discover ${id} agent at ${cardUrl}. Start specialist processes first. (${message})`,
      );
    }
  }
  return clients;
}

function extractText(result: unknown): string {
  if (!result || typeof result !== "object") return String(result);
  const r = result as {
    error?: { message?: string };
    result?: unknown;
    kind?: string;
    parts?: Array<{ kind?: string; text?: string }>;
  };
  if ("error" in r && r.error) {
    throw new Error(r.error.message ?? "A2A sendMessage error");
  }
  // JSON-RPC success envelope: { result: Message | Task }
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

export async function delegateToSpecialist(options: {
  specialist: SpecialistId;
  clients: SpecialistClients;
  config: A2aConfig;
  logger: JsonlLogger;
  request: Omit<DelegationRequest, "a2aTaskId" | "specialist"> & { a2aTaskId?: string };
}): Promise<DelegationEvidence> {
  const a2aTaskId = options.request.a2aTaskId ?? `a2a_${randomUUID()}`;
  const full: DelegationRequest = {
    ...options.request,
    a2aTaskId,
    specialist: options.specialist,
  };

  const ids = {
    runId: full.correlation.runId,
    sessionId: full.correlation.sessionId,
    turnId: full.correlation.turnId,
    a2aTaskId,
  };

  options.logger.log(
    "a2a.delegation.started",
    { specialist: options.specialist, question: full.question, customerId: full.customerId },
    ids,
  );

  const client = options.clients[options.specialist];
  if (!client) {
    const evidence: DelegationEvidence = {
      specialist: options.specialist,
      a2aTaskId,
      ok: false,
      summary: "",
      error: `Specialist ${options.specialist} is not available`,
    };
    options.logger.log("a2a.task.failed", evidence, { ...ids, level: "ERROR" });
    return evidence;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.config.a2aTimeoutMs);
  const started = Date.now();

  try {
    const response = await client.sendMessage({
      message: {
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: JSON.stringify(full) }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain", "application/json"],
      },
    });

    if (controller.signal.aborted) {
      throw new Error(`A2A timeout after ${options.config.a2aTimeoutMs}ms`);
    }

    const text = extractText(response);
    let evidence: DelegationEvidence;
    try {
      evidence = JSON.parse(text) as DelegationEvidence;
      evidence.a2aTaskId = evidence.a2aTaskId || a2aTaskId;
      evidence.specialist = options.specialist;
    } catch {
      evidence = {
        specialist: options.specialist,
        a2aTaskId,
        ok: true,
        summary: text,
      };
    }

    options.logger.log(
      "a2a.delegation.completed",
      { specialist: options.specialist, ok: evidence.ok, preview: evidence.summary.slice(0, 300) },
      { ...ids, durationMs: Date.now() - started },
    );
    return evidence;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const evidence: DelegationEvidence = {
      specialist: options.specialist,
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
