import Fastify from "fastify";
import { NorthstarDataStore } from "@northstar/data-access";
import { createDomainServices } from "@northstar/domain-services";
import { JsonlLogger, durationMs } from "@northstar/logger";
import type { RestConfig } from "./config.js";
import { registerRoutes } from "./routes/index.js";

export type AppContext = {
  config: RestConfig;
  services: ReturnType<typeof createDomainServices>;
  logger: JsonlLogger;
};

export async function buildApp(config: RestConfig, logger?: JsonlLogger) {
  const store = NorthstarDataStore.load({ dataDir: config.dataDir });
  const services = createDomainServices({
    store,
    knowledgeDir: config.knowledgeDir,
  });
  const runLogger =
    logger ??
    new JsonlLogger({
      logDir: config.logDir,
      phase: "00-rest",
      component: "server",
    });

  const app = Fastify({ logger: false });
  const ctx: AppContext = { config, services, logger: runLogger };

  app.addHook("onRequest", async (request) => {
    (request as { startedAt?: number }).startedAt = Date.now();
    runLogger.log(
      "http.request.started",
      { method: request.method, url: request.url },
      { requestId: request.id },
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = (request as { startedAt?: number }).startedAt ?? Date.now();
    runLogger.log(
      "http.request.completed",
      { method: request.method, url: request.url, statusCode: reply.statusCode },
      { requestId: request.id, durationMs: durationMs(startedAt) },
    );
  });

  app.setErrorHandler((error, request, reply) => {
    runLogger.log(
      "http.request.failed",
      { message: error.message },
      { requestId: request.id, level: "ERROR" },
    );
    reply.code(500).send({
      ok: false,
      error: { code: "INTERNAL", message: "Unexpected server error" },
    });
  });

  await registerRoutes(app, ctx);
  return { app, ctx };
}
