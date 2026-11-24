#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import { createCapabilities } from "./backends/factory.js";
import { runAgentTurn } from "./agent/loop.js";
import { createSession, describeSession, resetSession } from "./agent/session.js";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";

function pathBasename(filePath: string): string {
  return filePath.split(/[\\/]/).at(-1) ?? filePath;
}

function printHelp(): void {
  console.log(`Northstar Phase 1 Agentic CLI

Commands:
  /help   Show this help
  /new    Start a new in-memory session
  /state  Show session summary
  /log    Show current log file path
  /quit   Exit

Modes:
  TOOL_BACKEND=direct (default) — tools call domain services in-process
  TOOL_BACKEND=rest             — tools call Phase 0 REST via shared rest-client
`);
}

async function main(): Promise<void> {
  const loadedEnv = loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "01-agentic",
    component: "cli",
    logDir: config.logDir,
    runStartedData: {
      toolBackend: config.toolBackend,
      restBaseUrl: config.toolBackend === "rest" ? config.restBaseUrl : undefined,
      modelProvider: process.env.MODEL_PROVIDER ?? "mistral",
      modelName: process.env.MODEL_NAME,
      envFiles: loadedEnv,
    },
  });

  logger.log("capability.backend.selected", {
    capabilityBackend: config.toolBackend,
  });

  const capabilities = createCapabilities(config, logger);
  const model = createModelClientFromEnv();
  let session = createSession();

  console.log(`Phase 1 Agentic · TOOL_BACKEND=${config.toolBackend}`);
  console.log(
    `Model · provider=${process.env.MODEL_PROVIDER ?? "mistral"} · name=${process.env.MODEL_NAME ?? "(default)"}`,
  );
  if (loadedEnv.length) {
    console.log(`Env · loaded ${loadedEnv.map((p) => pathBasename(p)).join(", ")}`);
  }
  console.log(`Log file: ${logger.filePath}`);
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
      if (line === "/log") {
        console.log(logger.filePath);
        continue;
      }

      try {
        const result = await runAgentTurn(session, line, {
          model,
          capabilities,
          logger,
          maxIterations: config.maxIterations,
          turnTimeoutMs: config.turnTimeoutMs,
        });
        console.log(`\nagent> ${result.assistantText}\n`);
        if (result.toolNamesUsed.length) {
          console.log(`(tools: ${result.toolNamesUsed.join(" -> ")}; iterations=${result.iterations})\n`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log("assistant.response.sent", { error: message }, { level: "ERROR" });
        console.error(`\nerror> ${message}\n`);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
