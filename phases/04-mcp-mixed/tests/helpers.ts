import net from "node:net";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createPhaseLogger, type JsonlLogger } from "@northstar/logger";
import type { ModelClient } from "@northstar/model-client";
import { loadConfig, type MixedConfig } from "../src/config.js";
import { createContractRestCapabilities } from "../src/backends/factory.js";
import { connectBillingMcp, type BillingMcpSession } from "../src/facade/billing-mcp.js";
import { createMixedFacadeServer } from "../src/facade/create-server.js";
import { discoverServiceAgent } from "../src/facade/service-a2a.js";
import { connectFacadeSession, type McpHostSession } from "../src/client/mcp-session.js";
import { startServiceAgent, type ServiceAgentRuntime } from "../src/service-agent/create-server.js";

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("No port"));
        return;
      }
      const port = address.port;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

/** In-memory Phase 2 MCP server used as the billing child. */
async function startBillingMcpChild(options: {
  config: MixedConfig;
  runId: string;
  logDir: string;
}): Promise<{ session: BillingMcpSession; close: () => Promise<void> }> {
  const { createCapabilities } = await import("../../02-mcp/src/backends/factory.js");
  const { createNorthstarMcpServer } = await import("../../02-mcp/src/server/create-server.js");
  const { loadConfig: loadMcpConfig } = await import("../../02-mcp/src/config.js");

  const mcpConfig = loadMcpConfig({
    MCP_TOOL_BACKEND: options.config.billingMcpBackend,
    NORTHSTAR_DATA_DIR: options.config.dataDir,
    NORTHSTAR_KNOWLEDGE_DIR: options.config.knowledgeDir,
    LOG_DIR: options.logDir,
  });

  const serverLogger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "billing-mcp-server",
    logDir: options.logDir,
    runId: options.runId,
    fileName: `${options.runId}.billing.mcp-server.jsonl`,
    logRunStarted: false,
  });

  const capabilities = await createCapabilities(mcpConfig, serverLogger);
  const server = createNorthstarMcpServer({
    capabilities,
    knowledgeDir: mcpConfig.knowledgeDir,
    logger: serverLogger,
    backend: mcpConfig.mcpToolBackend,
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const facadeLogger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "mcp-facade",
    logDir: options.logDir,
    runId: options.runId,
    fileName: `${options.runId}.facade-billing-client.jsonl`,
    logRunStarted: false,
  });

  const session = await connectBillingMcp({
    config: options.config,
    logger: facadeLogger,
    transport: clientTransport,
  });

  return {
    session,
    close: async () => {
      await session.close();
      await server.close();
    },
  };
}

async function startRestApi(logDir: string): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const { buildApp } = await import("../../00-rest/src/app.js");
  const { loadConfig: loadRestConfig } = await import("../../00-rest/src/config.js");
  const restConfig = loadRestConfig();
  const logger = createPhaseLogger({
    phase: "00-rest",
    component: "mixed-parity-rest",
    logDir,
    fileName: `mixed-rest-${Date.now()}.jsonl`,
    logRunStarted: false,
  });
  const built = await buildApp(restConfig, logger);
  await built.app.listen({ port: 0, host: "127.0.0.1" });
  const address = built.app.server.address();
  if (!address || typeof address === "string") {
    throw new Error("REST listen failed");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await built.app.close();
    },
  };
}

export async function startMixedTestStack(options: {
  serviceModel: ModelClient;
}): Promise<{
  config: MixedConfig;
  hostLogger: JsonlLogger;
  mcp: McpHostSession;
  service: ServiceAgentRuntime;
  close: () => Promise<void>;
}> {
  const servicePort = await freePort();
  const prefix = `mixed-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const rest = await startRestApi(
    loadConfig().logDir,
  );

  const config = loadConfig({
    MIXED_SERVICE_HOST: "127.0.0.1",
    MIXED_SERVICE_PORT: String(servicePort),
    MIXED_BILLING_MCP_BACKEND: "direct",
    NORTHSTAR_REST_BASE_URL: rest.baseUrl,
  });

  const hostLogger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "mixed-host",
    logDir: config.logDir,
    fileName: `${prefix}.host.jsonl`,
    logRunStarted: false,
  });

  const facadeLogger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "mcp-facade",
    logDir: config.logDir,
    runId: hostLogger.runId,
    fileName: `${prefix}.facade.jsonl`,
    logRunStarted: false,
  });

  const service = await startServiceAgent({
    config,
    model: options.serviceModel,
    runId: hostLogger.runId,
  });

  const billing = await startBillingMcpChild({
    config,
    runId: hostLogger.runId,
    logDir: config.logDir,
  });

  const serviceClient = await discoverServiceAgent(config, facadeLogger);
  const contractCaps = await createContractRestCapabilities(config, facadeLogger);

  const facadeServer = createMixedFacadeServer({
    config,
    logger: facadeLogger,
    billing: billing.session,
    serviceClient,
    contractCaps,
    correlation: { runId: hostLogger.runId },
  });

  const [hostTransport, facadeTransport] = InMemoryTransport.createLinkedPair();
  await facadeServer.connect(facadeTransport);

  const mcp = await connectFacadeSession({
    config,
    logger: hostLogger,
    transport: hostTransport,
  });

  return {
    config,
    hostLogger,
    mcp,
    service,
    close: async () => {
      await mcp.close();
      await facadeServer.close();
      await billing.close();
      await service.close();
      await rest.close();
    },
  };
}
