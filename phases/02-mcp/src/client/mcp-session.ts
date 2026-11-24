import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JsonlLogger } from "@northstar/logger";
import type { ToolDefinition } from "@northstar/model-client";
import type { McpConfig } from "../config.js";

const require = createRequire(import.meta.url);

export type DiscoveredMcpTool = ToolDefinition & {
  rawInputSchema?: Record<string, unknown>;
};

export type McpHostSession = {
  client: Client;
  tools: DiscoveredMcpTool[];
  transport: Transport;
  close: () => Promise<void>;
};

function resolveTsxCli(): string {
  try {
    return require.resolve("tsx/cli");
  } catch {
    return "tsx";
  }
}

function mcpSchemaToParameters(inputSchema: unknown): Record<string, unknown> {
  if (inputSchema && typeof inputSchema === "object") {
    return inputSchema as Record<string, unknown>;
  }
  return { type: "object", properties: {} };
}

export async function connectMcpSession(options: {
  config: McpConfig;
  logger: JsonlLogger;
  /** Injected transport for in-process tests (InMemoryTransport). */
  transport?: Transport;
  /** Extra env for spawned stdio server. */
  serverEnv?: Record<string, string>;
}): Promise<McpHostSession> {
  const { config, logger } = options;
  const client = new Client(
    { name: "northstar-mcp-host", version: "0.1.0" },
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
      MCP_SERVER_LOG_FILE: `${logger.runId}.server.jsonl`,
      ...(options.serverEnv ?? {}),
    };

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolveTsxCli(), config.serverEntry],
      cwd: config.phaseRoot,
      env,
      stderr: "inherit",
    });
  }

  await client.connect(transport);
  logger.log("mcp.client.connected", {
    transport: options.transport ? "injected" : "stdio",
    backend: config.mcpToolBackend,
  });

  const listed = await client.listTools();
  const tools: DiscoveredMcpTool[] = listed.tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? tool.name,
    parameters: mcpSchemaToParameters(tool.inputSchema),
    rawInputSchema: tool.inputSchema as Record<string, unknown> | undefined,
  }));

  logger.log("mcp.tools.listed", {
    count: tools.length,
    names: tools.map((t) => t.name),
  });

  return {
    client,
    tools,
    transport,
    close: async () => {
      await client.close();
    },
  };
}

export async function callMcpTool(
  session: McpHostSession,
  options: {
    name: string;
    argumentsJson: string;
    logger: JsonlLogger;
    mcpRequestId: string;
    timeoutMs: number;
    ids?: { runId?: string; sessionId?: string; turnId?: string; toolCallId?: string };
  },
): Promise<{ content: string; isError: boolean }> {
  const { logger, mcpRequestId, ids } = options;
  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs = JSON.parse(options.argumentsJson || "{}") as Record<string, unknown>;
  } catch {
    const payload = {
      ok: false,
      error: { code: "INVALID_INPUT", message: "Tool arguments were not valid JSON" },
    };
    logger.log(
      "mcp.tool.completed",
      payload,
      { ...ids, mcpRequestId, level: "WARN" },
    );
    return { content: JSON.stringify(payload), isError: true };
  }

  logger.log(
    "mcp.tool.requested",
    { name: options.name, arguments: parsedArgs },
    { ...ids, mcpRequestId },
  );

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const result = await session.client.callTool(
      {
        name: options.name,
        arguments: parsedArgs,
        _meta: { mcpRequestId },
      },
      undefined,
      { signal: controller.signal, timeout: options.timeoutMs },
    );

    const textParts =
      Array.isArray(result.content)
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
    const payload = {
      ok: false,
      error: {
        code: controller.signal.aborted ? "TIMEOUT" : "MCP_ERROR",
        message,
      },
    };
    logger.log(
      "mcp.tool.completed",
      payload,
      {
        ...ids,
        mcpRequestId,
        durationMs: Date.now() - started,
        level: "ERROR",
      },
    );
    return { content: JSON.stringify(payload), isError: true };
  } finally {
    clearTimeout(timer);
  }
}

export async function readMcpResource(
  session: McpHostSession,
  uri: string,
  logger: JsonlLogger,
  mcpRequestId: string,
): Promise<string> {
  logger.log("mcp.resource.read", { uri, role: "host" }, { mcpRequestId });
  const result = await session.client.readResource({ uri });
  const text = result.contents
    .map((c) => ("text" in c && typeof c.text === "string" ? c.text : JSON.stringify(c)))
    .join("\n");
  return text;
}
