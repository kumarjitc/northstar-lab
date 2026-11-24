#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import { connectFacadeSession } from "./client/mcp-session.js";
import { runAgentTurn } from "./client/loop.js";
import { createSession, describeSession, resetSession } from "./client/session.js";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";
import { startServiceAgentProcess } from "./process/start-service-agent.js";

function printHelp(): void {
  console.log(`Northstar Phase 4 — mixed MCP facade

Host speaks MCP only. Behind the facade:
  billing  → MCP (Phase 2 server child)
  service  → A2A agent (direct CapabilitySet tools)
  contract → REST (Phase 0)

Commands:
  /help   Show this help
  /new    New session
  /state  Session summary
  /tools  List facade MCP tools
  /log    Log paths
  /quit   Exit

Requires: Phase 0 running when contract tools are used (\`npm run rest\`).
`);
}

async function main(): Promise<void> {
  const loadedEnv = loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "04-mcp-mixed",
    component: "mixed-host",
    logDir: config.logDir,
    runStartedData: {
      role: "host",
      billing: `mcp:${config.billingMcpBackend}`,
      service: "a2a/direct",
      contract: "rest",
      modelProvider: process.env.MODEL_PROVIDER ?? "mistral",
      envFiles: loadedEnv,
    },
  });

  logger.log("capability.backend.selected", {
    billing: `mcp/${config.billingMcpBackend}`,
    service: "a2a/direct",
    contract: "rest",
  });

  console.log("Phase 4 mixed MCP facade");
  console.log(
    `  billing=mcp/${config.billingMcpBackend} · service=a2a/direct · contract=rest@${config.restBaseUrl}`,
  );
  console.log("Starting service A2A agent…");
  const serviceProc = await startServiceAgentProcess(config, {
    MIXED_PARENT_RUN_ID: logger.runId,
  });

  console.log("Connecting host → facade MCP…");
  const mcp = await connectFacadeSession({ config, logger });
  const model = createModelClientFromEnv();
  let session = createSession();

  console.log(`MCP tools discovered: ${mcp.tools.length}`);
  console.log(`Host log: ${logger.filePath}`);
  console.log("Type /help for commands.\n");

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
      if (line === "/log") {
        console.log(`host: ${logger.filePath}`);
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
          console.log(`(tools: ${result.toolNamesUsed.join(" -> ")}; iterations=${result.iterations})\n`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nerror> ${message}\n`);
      }
    }
  } finally {
    rl.close();
    await mcp.close();
    await serviceProc.stop();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
