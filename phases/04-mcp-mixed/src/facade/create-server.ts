import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { A2AClient } from "@a2a-js/sdk/client";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { JsonlLogger } from "@northstar/logger";
import type { MixedConfig } from "../config.js";
import {
  createFacadeCatalog,
  SERVICE_AGENT_TOOL,
  type MixedTransport,
} from "../shared/domains.js";
import { proxyBillingTool, type BillingMcpSession } from "./billing-mcp.js";
import { askServiceAgent } from "./service-a2a.js";

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
    content: [{ type: "text" as const, text: typeof payload === "string" ? payload : JSON.stringify(payload) }],
    ...(isError ? { isError: true } : {}),
  };
}

export type FacadeDeps = {
  config: MixedConfig;
  logger: JsonlLogger;
  billing: BillingMcpSession;
  serviceClient: A2AClient;
  contractCaps: CapabilitySet;
  /** Optional correlation defaults when host does not pass ids. */
  correlation?: { runId?: string; sessionId?: string; turnId?: string };
};

export function createMixedFacadeServer(deps: FacadeDeps): McpServer {
  const { config, logger, billing, serviceClient, contractCaps } = deps;

  const server = new McpServer(
    { name: "northstar-mcp-mixed-facade", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Northstar mixed MCP facade. Billing tools proxy to MCP; ask_service_agent uses A2A; " +
        "contract tools call Phase 0 REST. Prefer the right domain tool for each question.",
    },
  );

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

  for (const tool of createFacadeCatalog()) {
    registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          readOnlyHint: tool.name !== "draftSupportCase",
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async (args, extra) => {
        const { mcpRequestId } = asMeta(extra);
        const started = Date.now();
        const transport: MixedTransport = tool.transport;

        logger.log(
          "mcp.server.request.received",
          { tool: tool.name, transport, arguments: args },
          { mcpRequestId },
        );

        try {
          let payload: unknown;
          let isError = false;

          if (transport === "mcp") {
            const proxied = await proxyBillingTool(
              billing,
              tool.name,
              args ?? {},
              config.mcpCallTimeoutMs,
            );
            payload = tryParseJson(proxied.content);
            isError = proxied.isError;
            logger.log(
              "mixed.billing.mcp.proxied",
              { tool: tool.name, isError },
              { mcpRequestId, durationMs: Date.now() - started },
            );
          } else if (transport === "a2a" && tool.name === SERVICE_AGENT_TOOL) {
            const question =
              typeof args?.question === "string" ? args.question : "Service evidence needed";
            const customerId =
              typeof args?.customerId === "string" ? args.customerId : undefined;
            const evidence = await askServiceAgent({
              client: serviceClient,
              config,
              logger,
              question,
              customerId,
              correlation: {
                runId: deps.correlation?.runId ?? logger.runId,
                sessionId: deps.correlation?.sessionId ?? "session_facade",
                turnId: deps.correlation?.turnId ?? `turn_${mcpRequestId}`,
              },
            });
            payload = evidence;
            isError = evidence.ok === false;
            logger.log(
              "mixed.service.a2a.delegated",
              { tool: tool.name, ok: evidence.ok, a2aTaskId: evidence.a2aTaskId },
              { mcpRequestId, a2aTaskId: evidence.a2aTaskId, durationMs: Date.now() - started },
            );
          } else if (transport === "rest" && tool.executeRest) {
            payload = await tool.executeRest(args ?? {}, contractCaps);
            logger.log(
              "mixed.contract.rest.called",
              { tool: tool.name },
              { mcpRequestId, durationMs: Date.now() - started },
            );
          } else {
            throw new Error(`No handler for tool ${tool.name} transport=${transport}`);
          }

          logger.log(
            "mixed.route.executed",
            { tool: tool.name, transport, ok: !isError },
            { mcpRequestId, durationMs: Date.now() - started },
          );
          logger.log(
            "mcp.server.tool.executed",
            { tool: tool.name, ok: !isError, transport },
            { mcpRequestId, durationMs: Date.now() - started },
          );
          logger.log(
            "mcp.server.response.sent",
            { tool: tool.name, ok: !isError, transport },
            { mcpRequestId, durationMs: Date.now() - started },
          );
          return toolResult(payload, isError);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const payload = { ok: false, error: { code: "INTERNAL", message } };
          logger.log(
            "mixed.route.executed",
            { tool: tool.name, transport, ok: false, error: message },
            { mcpRequestId, durationMs: Date.now() - started, level: "ERROR" },
          );
          logger.log(
            "mcp.server.tool.executed",
            { tool: tool.name, ok: false, transport, error: message },
            { mcpRequestId, durationMs: Date.now() - started, level: "ERROR" },
          );
          return toolResult(payload, true);
        }
      },
    );
  }

  return server;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
