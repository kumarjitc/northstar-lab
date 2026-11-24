import path from "node:path";
import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JsonlLogger } from "@northstar/logger";
import type { ToolDefinition } from "@northstar/model-client";
import type { A2aConfig, SpecialistId } from "../config.js";
import { SPECIALIST_TOOL_ALLOWLIST } from "../shared/types.js";

const require = createRequire(import.meta.url);

export type McpSession = {
  client: Client;
  tools: ToolDefinition[];
  close: () => Promise<void>;
};

function resolveTsxCli(): string {
  try {
    return require.resolve("tsx/cli");
  } catch {
    return "tsx";
  }
}

function schemaToParams(inputSchema: unknown): Record<string, unknown> {
  if (inputSchema && typeof inputSchema === "object") {
    return inputSchema as Record<string, unknown>;
  }
  return { type: "object", properties: {} };
}

export async function connectSpecialistMcp(options: {
  config: A2aConfig;
  logger: JsonlLogger;
  specialist: SpecialistId;
  transport?: Transport;
  logFileSuffix?: string;
}): Promise<McpSession> {
  const { config, logger, specialist } = options;
  const client = new Client(
    { name: `northstar-a2a-${specialist}`, version: "0.1.0" },
    { capabilities: {} },
  );

  let transport: Transport;
  if (options.transport) {
    transport = options.transport;
  } else {
    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] != null),
      ),
      MCP_TOOL_BACKEND: config.mcpToolBackend,
      NORTHSTAR_REST_BASE_URL: config.restBaseUrl,
      REST_REQUEST_TIMEOUT_MS: String(config.restTimeoutMs),
      NORTHSTAR_DATA_DIR: config.dataDir,
      NORTHSTAR_KNOWLEDGE_DIR: config.knowledgeDir,
      LOG_DIR: config.logDir,
      MCP_RUN_ID: logger.runId,
      MCP_SERVER_LOG_FILE:
        options.logFileSuffix ?? `${logger.runId}.${specialist}.mcp-server.jsonl`,
    };
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolveTsxCli(), config.mcpServerEntry],
      cwd: path.dirname(config.mcpServerEntry),
      env,
      stderr: "inherit",
    });
  }

  await client.connect(transport);
  logger.log("mcp.client.connected", {
    specialist,
    backend: config.mcpToolBackend,
    a2aCapabilityBackend: config.capabilityBackend,
  });

  const listed = await client.listTools();
  const allow = new Set(SPECIALIST_TOOL_ALLOWLIST[specialist]);
  const tools = listed.tools
    .filter((t) => allow.has(t.name))
    .map((t) => ({
      name: t.name,
      description: t.description ?? t.name,
      parameters: schemaToParams(t.inputSchema),
    }));

  logger.log("mcp.tools.listed", {
    specialist,
    count: tools.length,
    names: tools.map((t) => t.name),
  });

  return {
    client,
    tools,
    close: async () => {
      await client.close();
    },
  };
}

export async function callMcpTool(
  session: McpSession,
  options: {
    name: string;
    args: Record<string, unknown>;
    logger: JsonlLogger;
    mcpRequestId: string;
    timeoutMs: number;
    ids?: Record<string, string>;
  },
): Promise<{ content: string; isError: boolean }> {
  const { logger, mcpRequestId, ids } = options;
  logger.log(
    "mcp.tool.requested",
    { name: options.name, arguments: options.args },
    { ...ids, mcpRequestId },
  );
  const started = Date.now();
  try {
    const result = await session.client.callTool(
      {
        name: options.name,
        arguments: options.args,
        _meta: { mcpRequestId },
      },
      undefined,
      { timeout: options.timeoutMs },
    );
    const textParts = Array.isArray(result.content)
      ? result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
      : [];
    const content = textParts.join("\n") || JSON.stringify(result);
    const isError = Boolean(result.isError);
    logger.log(
      "mcp.tool.completed",
      { name: options.name, isError, preview: content.slice(0, 500) },
      {
        ...ids,
        mcpRequestId,
        durationMs: Date.now() - started,
        level: isError ? "WARN" : "INFO",
      },
    );
    return { content, isError };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload = { ok: false, error: { code: "MCP_ERROR", message } };
    logger.log("mcp.tool.completed", payload, {
      ...ids,
      mcpRequestId,
      durationMs: Date.now() - started,
      level: "ERROR",
    });
    return { content: JSON.stringify(payload), isError: true };
  }
}

export { InMemoryTransport };
