#!/usr/bin/env node
/**
 * Northstar MCP server process (stdio transport).
 * Do not write protocol traffic to stdout — use the JSONL logger (file) and stderr only.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPhaseLogger } from "@northstar/logger";
import { createCapabilities } from "../backends/factory.js";
import { loadConfig } from "../config.js";
import { loadEnvFiles } from "../load-env.js";
import { createNorthstarMcpServer } from "./create-server.js";

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();

  const logger = createPhaseLogger({
    phase: "02-mcp",
    component: "mcp-server",
    logDir: config.logDir,
    runId: process.env.MCP_RUN_ID,
    fileName: process.env.MCP_SERVER_LOG_FILE,
    runStartedData: {
      role: "server",
      mcpToolBackend: config.mcpToolBackend,
      restBaseUrl: config.mcpToolBackend === "rest" ? config.restBaseUrl : undefined,
    },
  });

  logger.log("capability.backend.selected", {
    capabilityBackend: config.mcpToolBackend,
    role: "server",
  });

  const capabilities = await createCapabilities(config, logger);
  const server = createNorthstarMcpServer({
    capabilities,
    knowledgeDir: config.knowledgeDir,
    logger,
    backend: config.mcpToolBackend,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[northstar-mcp-server] ready · backend=${config.mcpToolBackend} · log=${logger.filePath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
