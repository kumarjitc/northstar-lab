import { createPhaseLogger } from "@northstar/logger";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

async function main() {
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "00-rest",
    component: "server",
    logDir: config.logDir,
    runStartedData: {
      port: config.port,
      dataDir: config.dataDir,
      knowledgeDir: config.knowledgeDir,
    },
  });

  const { app } = await buildApp(config, logger);
  await app.listen({ port: config.port, host: config.host });
  logger.log("server.listening", { host: config.host, port: config.port });
  console.log(`Phase 0 REST listening on http://${config.host}:${config.port}`);
  console.log(`Logs: ${logger.filePath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
