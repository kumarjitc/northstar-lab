#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";
import { discoverSpecialists } from "./orchestrator/delegation.js";
import { runOrchestratorTurn } from "./orchestrator/loop.js";
import {
  createOrchestratorSession,
  resetOrchestratorSession,
} from "./orchestrator/session.js";
import { startSpecialistProcesses } from "./process/start-specialists.js";

function pathBasename(filePath: string): string {
  return filePath.split(/[\\/]/).at(-1) ?? filePath;
}

function printHelp(): void {
  console.log(`Northstar Phase 3 A2A CLI

Commands:
  /help   Show this help
  /new    New conversation session
  /agents List discovered specialist Agent Cards
  /log    Show orchestrator log path
  /quit   Exit (stops child specialists started by this CLI)

Architecture:
  User -> Support Orchestrator -> A2A -> Billing|Service|Contract -> MCP
`);
}

async function main(): Promise<void> {
  const loadedEnv = loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "03-a2a",
    component: "orchestrator",
    logDir: config.logDir,
    runStartedData: {
      role: "orchestrator",
      a2aCapabilityBackend: config.capabilityBackend,
      modelProvider: process.env.MODEL_PROVIDER ?? "mistral",
      envFiles: loadedEnv,
    },
  });

  logger.log("capability.backend.selected", {
    capabilityBackend: config.capabilityBackend,
    role: "orchestrator",
  });

  console.log(`Phase 3 A2A · A2A_CAPABILITY_BACKEND=${config.capabilityBackend}`);
  console.log("Starting specialist agents (billing/service/contract)…");

  const procs = await startSpecialistProcesses(config, {
    // Share run id prefix via env for easier correlation if specialists read it later
    A2A_PARENT_RUN_ID: logger.runId,
  });

  const clients = await discoverSpecialists(config, logger);
  const model = createModelClientFromEnv();
  let session = createOrchestratorSession();

  console.log("Specialists ready.");
  console.log(`Orchestrator log: ${logger.filePath}`);
  if (loadedEnv.length) {
    console.log(`Env · ${loadedEnv.map(pathBasename).join(", ")}`);
  }
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
        session = resetOrchestratorSession();
        console.log(`New session: ${session.sessionId}`);
        continue;
      }
      if (line === "/log") {
        console.log(logger.filePath);
        continue;
      }
      if (line === "/agents") {
        for (const id of ["billing", "service", "contract"] as const) {
          const card = await clients[id].getAgentCard();
          console.log(`- ${id}: ${card.name} @ ${card.url}`);
        }
        continue;
      }

      try {
        const result = await runOrchestratorTurn(session, line, {
          model,
          clients,
          config,
          logger,
        });
        console.log(`\nagent> ${result.assistantText}\n`);
        if (result.delegations.length) {
          console.log(
            `(a2a: ${result.delegations.map((d) => `${d.specialist}${d.ok ? "" : "!"}`).join(" -> ")}; iterations=${result.iterations})\n`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nerror> ${message}\n`);
      }
    }
  } finally {
    rl.close();
    await procs.stop();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
