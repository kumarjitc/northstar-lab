import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JsonlLogger } from "@northstar/logger";
import type { MixedConfig } from "../config.js";

const require = createRequire(import.meta.url);

function resolveTsxCli(): string {
  try {
    return require.resolve("tsx/cli");
  } catch {
    return "tsx";
  }
}

export type BillingMcpSession = {
  client: Client;
  close: () => Promise<void>;
};

/** Connect to Phase 2 MCP server as a billing capability child (stdio or injected). */
export async function connectBillingMcp(options: {
  config: MixedConfig;
  logger: JsonlLogger;
  transport?: Transport;
}): Promise<BillingMcpSession> {
  const { config, logger } = options;
  const client = new Client(
    { name: "mixed-facade-billing", version: "0.1.0" },
    { capabilities: {} },
  );

  let transport: Transport;
  if (options.transport) {
    transport = options.transport;
  } else {
    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter((e): e is [string, string] => e[1] != null),
      ),
      MCP_TOOL_BACKEND: config.billingMcpBackend,
      NORTHSTAR_REST_BASE_URL: config.restBaseUrl,
      REST_REQUEST_TIMEOUT_MS: String(config.restTimeoutMs),
      NORTHSTAR_DATA_DIR: config.dataDir,
      NORTHSTAR_KNOWLEDGE_DIR: config.knowledgeDir,
      LOG_DIR: config.logDir,
      MCP_RUN_ID: logger.runId,
      MCP_SERVER_LOG_FILE: `${logger.runId}.billing.mcp-server.jsonl`,
    };
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolveTsxCli(), config.billingMcpServerEntry],
      cwd: config.repoRoot,
      env,
      stderr: "inherit",
    });
  }

  await client.connect(transport);
  const listed = await client.listTools();
  logger.log("mcp.client.connected", {
    role: "facade→billing-mcp",
    backend: config.billingMcpBackend,
    toolCount: listed.tools.length,
  });

  return {
    client,
    close: async () => {
      await client.close();
    },
  };
}

export async function proxyBillingTool(
  session: BillingMcpSession,
  name: string,
  args: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ content: string; isError: boolean }> {
  const result = await session.client.callTool(
    { name, arguments: args },
    undefined,
    { timeout: timeoutMs },
  );
  const textParts = Array.isArray(result.content)
    ? result.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
    : [];
  return {
    content: textParts.join("\n") || JSON.stringify(result),
    isError: Boolean(result.isError),
  };
}
