import { randomUUID } from "node:crypto";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadKnowledgeArticles } from "@northstar/knowledge-search";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { JsonlLogger } from "@northstar/logger";
import { createToolCatalog } from "./tool-catalog.js";

function asMeta(extra: unknown): { mcpRequestId: string } {
  const record = (extra ?? {}) as {
    _meta?: Record<string, unknown>;
    requestId?: string | number;
  };
  const fromMeta =
    record._meta && typeof record._meta.mcpRequestId === "string"
      ? record._meta.mcpRequestId
      : undefined;
  return { mcpRequestId: fromMeta ?? String(record.requestId ?? `mcp_${randomUUID()}`) };
}

function toolResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    ...(isError ? { isError: true } : {}),
  };
}

export type CreateNorthstarMcpServerOptions = {
  capabilities: CapabilitySet;
  knowledgeDir: string;
  logger: JsonlLogger;
  backend: "direct" | "rest";
};

export function createNorthstarMcpServer(options: CreateNorthstarMcpServerOptions): McpServer {
  const { capabilities, knowledgeDir, logger, backend } = options;
  const articles = loadKnowledgeArticles(knowledgeDir);

  const server = new McpServer(
    { name: "northstar-mcp", version: "0.1.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "Northstar Broadband MCP server. Use tools for factual lookups. " +
        "Knowledge articles are also available as resources under knowledge://articles/{articleId}.",
    },
  );

  // Loosen registerTool typing: many Zod shapes make TS instantiation explode.
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
      annotations?: Record<string, unknown>;
    },
    cb: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>,
  ) => void;

  for (const tool of createToolCatalog()) {
    registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          readOnlyHint: tool.kind === "read",
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async (args, extra) => {
        const { mcpRequestId } = asMeta(extra);
        const started = Date.now();
        logger.log(
          "mcp.server.request.received",
          { tool: tool.name, arguments: args, backend },
          { mcpRequestId },
        );

        try {
          const result = await tool.execute(args ?? {}, capabilities);
          logger.log(
            "mcp.server.tool.executed",
            { tool: tool.name, ok: true, backend },
            { mcpRequestId, durationMs: Date.now() - started },
          );
          logger.log(
            "mcp.server.response.sent",
            { tool: tool.name, ok: true },
            { mcpRequestId, durationMs: Date.now() - started },
          );
          return toolResult(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const payload = {
            ok: false,
            error: { code: "INTERNAL", message },
          };
          logger.log(
            "mcp.server.tool.executed",
            { tool: tool.name, ok: false, error: message, backend },
            { mcpRequestId, durationMs: Date.now() - started, level: "ERROR" },
          );
          logger.log(
            "mcp.server.response.sent",
            { tool: tool.name, ok: false },
            { mcpRequestId, durationMs: Date.now() - started, level: "ERROR" },
          );
          return toolResult(payload, true);
        }
      },
    );
  }

  server.registerResource(
    "knowledge-index",
    "knowledge://articles",
    {
      title: "Knowledge article index",
      description: "List of Northstar decisioning knowledge articles available as MCP resources.",
      mimeType: "application/json",
    },
    async (uri, extra) => {
      const { mcpRequestId } = asMeta(extra);
      const index = articles.map((a) => ({
        articleId: a.articleId,
        title: a.title,
        category: a.category,
        uri: `knowledge://articles/${a.articleId}`,
      }));
      logger.log(
        "mcp.resource.read",
        { uri: String(uri), kind: "index", count: index.length },
        { mcpRequestId },
      );
      return {
        contents: [
          {
            uri: String(uri),
            mimeType: "application/json",
            text: JSON.stringify(index, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "knowledge-article",
    new ResourceTemplate("knowledge://articles/{articleId}", {
      list: async () => ({
        resources: articles.map((a) => ({
          uri: `knowledge://articles/${a.articleId}`,
          name: a.title,
          description: `${a.category} · ${a.articleId}`,
          mimeType: "text/markdown",
        })),
      }),
    }),
    {
      title: "Knowledge article",
      description: "Full text of a Northstar knowledge article.",
      mimeType: "text/markdown",
    },
    async (uri, variables, extra) => {
      const { mcpRequestId } = asMeta(extra);
      const articleId = String(variables.articleId ?? "");
      const article = articles.find((a) => a.articleId === articleId);
      if (!article) {
        logger.log(
          "mcp.resource.read",
          { uri: String(uri), ok: false, articleId },
          { mcpRequestId, level: "WARN" },
        );
        return {
          contents: [
            {
              uri: String(uri),
              mimeType: "application/json",
              text: JSON.stringify({
                ok: false,
                error: { code: "NOT_FOUND", message: `Unknown article ${articleId}` },
              }),
            },
          ],
        };
      }
      logger.log(
        "mcp.resource.read",
        { uri: String(uri), ok: true, articleId: article.articleId },
        { mcpRequestId },
      );
      const body = [
        `# ${article.title}`,
        "",
        `articleId: ${article.articleId}`,
        `category: ${article.category}`,
        article.lastReviewed ? `lastReviewed: ${article.lastReviewed}` : null,
        "",
        article.body,
      ]
        .filter((line) => line !== null)
        .join("\n");
      return {
        contents: [
          {
            uri: String(uri),
            mimeType: "text/markdown",
            text: body,
          },
        ],
      };
    },
  );

  return server;
}
