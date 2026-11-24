import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JsonlLogger } from "@northstar/logger";
import type { ToolDefinition } from "@northstar/model-client";
import type { MixedConfig } from "../config.js";

const require = createRequire(import.meta.url);

function resolveTsxCli(): string {
  try {
    return require.resolve("tsx/cli");
  } catch {
    return "tsx";
  }
}

export type DiscoveredMcpTool = ToolDefinition & {
  rawInputSchema?: Record<string, unknown>;
};

export type McpHostSession = {
  client: Client;
  tools: DiscoveredMcpTool[];
  close: () => Promise<void>;
};

function mcpSchemaToParameters(inputSchema: unknown): Record<string, unknown> {
  if (inputSchema && typeof inputSchema === "object") {
    return inputSchema as Record<string, unknown>;
  }
  return { type: "object", properties: {} };
}

/** Host → facade MCP (stdio or injected transport). */
export async function connectFacadeSession(options: {
  config: MixedConfig;
  logger: JsonlLogger;
  transport?: Transport;
  serverEnv?: Record<string, string>;
}): Promise<McpHostSession> {
  const { config, logger } = options;
  const client = new Client(
    { name: "northstar-mixed-host", version: "0.1.0" },
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
      MIXED_PARENT_RUN_ID: logger.runId,
      MCP_RUN_ID: logger.runId,
      MCP_SERVER_LOG_FILE: `${logger.runId}.facade.jsonl`,
      LOG_DIR: config.logDir,
      MIXED_BILLING_MCP_BACKEND: config.billingMcpBackend,
      NORTHSTAR_REST_BASE_URL: config.restBaseUrl,
      MIXED_SERVICE_HOST: config.serviceHost,
      MIXED_SERVICE_PORT: String(config.servicePort),
      ...(options.serverEnv ?? {}),
    };
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolveTsxCli(), config.facadeEntry],
      cwd: config.phaseRoot,
      env,
      stderr: "inherit",
    });
  }

  await client.connect(transport);
  logger.log("mcp.client.connected", {
    transport: options.transport ? "injected" : "stdio",
    role: "host→facade",
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
    close: async () => {
      await client.close();
    },
  };
}

export async function callFacadeTool(
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
    return { content: JSON.stringify(payload), isError: true };
  }

  logger.log(
    "mcp.tool.requested",
    { name: options.name, arguments: parsedArgs },
    { ...ids, mcpRequestId },
  );
  logger.log(
    "tool.requested",
    { name: options.name, via: "mcp", argumentsJson: options.argumentsJson },
    { ...ids, mcpRequestId, toolCallId: ids?.toolCallId },
  );

  const started = Date.now();
  try {
    const result = await session.client.callTool(
      {
        name: options.name,
        arguments: parsedArgs,
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
    logger.log(
      "tool.completed",
      { name: options.name, via: "mcp", preview: content.slice(0, 500) },
      { ...ids, mcpRequestId, toolCallId: ids?.toolCallId, durationMs: Date.now() - started },
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
