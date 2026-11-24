#!/usr/bin/env node
/**
 * Mixed MCP facade process (stdio).
 * Host talks only to this server. Internally: billing→MCP, service→A2A, contract→REST.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPhaseLogger } from "@northstar/logger";
import { createContractRestCapabilities } from "../backends/factory.js";
import { loadConfig } from "../config.js";
import { loadEnvFiles } from "../load-env.js";
import { connectBillingMcp } from "./billing-mcp.js";
import { createMixedFacadeServer } from "./create-server.js";
import { discoverServiceAgent } from "./service-a2a.js";

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();

  const logger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "mcp-facade",
    logDir: config.logDir,
    runId: process.env.MIXED_PARENT_RUN_ID ?? process.env.MCP_RUN_ID,
    fileName: process.env.MCP_SERVER_LOG_FILE,
    runStartedData: {
      role: "facade",
      billing: `mcp:${config.billingMcpBackend}`,
      service: "a2a→direct",
      contract: "rest",
    },
  });

  logger.log("capability.backend.selected", {
    billing: `mcp/${config.billingMcpBackend}`,
    service: "a2a/direct",
    contract: "rest",
  });

  console.error("[mcp-facade] connecting billing MCP child…");
  const billing = await connectBillingMcp({ config, logger });

  console.error("[mcp-facade] discovering service A2A agent…");
  const serviceClient = await discoverServiceAgent(config, logger);

  console.error("[mcp-facade] connecting contract REST…");
  const contractCaps = await createContractRestCapabilities(config, logger);

  const server = createMixedFacadeServer({
    config,
    logger,
    billing,
    serviceClient,
    contractCaps,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp-facade] ready · log=${logger.filePath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
