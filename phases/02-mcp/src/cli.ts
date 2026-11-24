#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import { connectMcpSession } from "./client/mcp-session.js";
import { runAgentTurn } from "./client/loop.js";
import { createSession, describeSession, resetSession } from "./client/session.js";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";

function pathBasename(filePath: string): string {
  return filePath.split(/[\\/]/).at(-1) ?? filePath;
}

function printHelp(): void {
  console.log(`Northstar Phase 2 MCP CLI

Commands:
  /help       Show this help
  /new        Start a new in-memory session
  /state      Show session summary
  /tools      List MCP-discovered tools
  /resources  List MCP resources
  /log        Show host + server log file paths
  /quit       Exit

Modes:
  MCP_TOOL_BACKEND=direct (default) — MCP server -> domain-services
  MCP_TOOL_BACKEND=rest             — MCP server -> REST client -> Phase 0
`);
}

async function main(): Promise<void> {
  const loadedEnv = loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "02-mcp",
    component: "mcp-host",
    logDir: config.logDir,
    runStartedData: {
      role: "host",
      mcpToolBackend: config.mcpToolBackend,
      restBaseUrl: config.mcpToolBackend === "rest" ? config.restBaseUrl : undefined,
      modelProvider: process.env.MODEL_PROVIDER ?? "mistral",
      modelName: process.env.MODEL_NAME,
      envFiles: loadedEnv,
    },
  });

  logger.log("capability.backend.selected", {
    capabilityBackend: config.mcpToolBackend,
    role: "host",
  });

  console.log(`Phase 2 MCP · MCP_TOOL_BACKEND=${config.mcpToolBackend}`);
  console.log(
    `Model · provider=${process.env.MODEL_PROVIDER ?? "mistral"} · name=${process.env.MODEL_NAME ?? "(default)"}`,
  );
  console.log("Connecting MCP server over stdio…");

  const mcp = await connectMcpSession({ config, logger });
  const model = createModelClientFromEnv();
  let session = createSession();
  const serverLog = `${logger.runId}.server.jsonl`;

  console.log(`MCP tools discovered: ${mcp.tools.length}`);
  console.log(`Host log:   ${logger.filePath}`);
  console.log(`Server log: ${config.logDir}/${serverLog}`);
  console.log("Type /help for commands. Ask a Northstar support question to begin.\n");

  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const line = (await rl.question("you> ")).trim();
      if (!line) continue;

      if (line === "/help") {
        printHelp();
        continue;
      }
      if (line === "/quit" || line === "/exit") {
        logger.log("run.completed", { reason: "user_quit" });
        break;
      }
      if (line === "/new") {
        session = resetSession(session);
        console.log(`New session: ${session.sessionId}`);
        continue;
      }
      if (line === "/state") {
        console.log(describeSession(session));
        continue;
      }
      if (line === "/tools") {
        for (const tool of mcp.tools) {
          console.log(`- ${tool.name}: ${tool.description}`);
        }
        continue;
      }
      if (line === "/resources") {
        const listed = await mcp.client.listResources();
        for (const resource of listed.resources) {
          console.log(`- ${resource.uri} · ${resource.name ?? ""}`);
        }
        continue;
      }
      if (line === "/log") {
        console.log(`host:   ${logger.filePath}`);
        console.log(`server: ${config.logDir}/${serverLog}`);
        continue;
      }

      try {
        const result = await runAgentTurn(session, line, {
          model,
          mcp,
          logger,
          maxIterations: config.maxIterations,
          turnTimeoutMs: config.turnTimeoutMs,
          mcpCallTimeoutMs: config.mcpCallTimeoutMs,
        });
        console.log(`\nagent> ${result.assistantText}\n`);
        if (result.toolNamesUsed.length) {
          console.log(
            `(mcp tools: ${result.toolNamesUsed.join(" -> ")}; iterations=${result.iterations})\n`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log("assistant.response.sent", { error: message }, { level: "ERROR" });
        console.error(`\nerror> ${message}\n`);
      }
    }
  } finally {
    rl.close();
    await mcp.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
