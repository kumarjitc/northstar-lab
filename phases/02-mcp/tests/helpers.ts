import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createPhaseLogger, type JsonlLogger } from "@northstar/logger";
import { createCapabilities } from "../src/backends/factory.js";
import { connectMcpSession, type McpHostSession } from "../src/client/mcp-session.js";
import { loadConfig, type McpConfig } from "../src/config.js";
import { createNorthstarMcpServer } from "../src/server/create-server.js";

export async function startInMemoryMcp(options?: {
  backend?: "direct" | "rest";
  restBaseUrl?: string;
  logFilePrefix?: string;
}): Promise<{
  config: McpConfig;
  hostLogger: JsonlLogger;
  serverLogger: JsonlLogger;
  mcp: McpHostSession;
  close: () => Promise<void>;
}> {
  const config = loadConfig({
    MCP_TOOL_BACKEND: options?.backend ?? "direct",
    NORTHSTAR_REST_BASE_URL: options?.restBaseUrl,
  });
  const prefix = options?.logFilePrefix ?? `mcp-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const hostLogger = createPhaseLogger({
    phase: "02-mcp",
    component: "mcp-host",
    logDir: config.logDir,
    fileName: `${prefix}.host.jsonl`,
    logRunStarted: false,
  });
  const serverLogger = createPhaseLogger({
    phase: "02-mcp",
    component: "mcp-server",
    logDir: config.logDir,
    runId: hostLogger.runId,
    fileName: `${prefix}.server.jsonl`,
    logRunStarted: false,
  });

  const capabilities = await createCapabilities(config, serverLogger);
  const server = createNorthstarMcpServer({
    capabilities,
    knowledgeDir: config.knowledgeDir,
    logger: serverLogger,
    backend: config.mcpToolBackend,
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const mcp = await connectMcpSession({
    config,
    logger: hostLogger,
    transport: clientTransport,
  });

  return {
    config,
    hostLogger,
    serverLogger,
    mcp,
    close: async () => {
      await mcp.close();
      await server.close();
    },
  };
}
