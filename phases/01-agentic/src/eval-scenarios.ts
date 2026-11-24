#!/usr/bin/env node
/**
 * Optional live-model evaluation against scenario-kit prompts.
 * Deterministic CI uses MockModelClient tests instead.
 */
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import {
  STANDARD_SCENARIOS,
  assertNoForbiddenClaims,
} from "@northstar/scenario-kit";
import { createCapabilities } from "./backends/factory.js";
import { runAgentTurn } from "./agent/loop.js";
import { createSession } from "./agent/session.js";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "01-agentic",
    component: "eval",
    logDir: config.logDir,
    runStartedData: { toolBackend: config.toolBackend, mode: "scenario-eval" },
  });
  logger.log("capability.backend.selected", { capabilityBackend: config.toolBackend });

  const capabilities = createCapabilities(config, logger);
  const model = createModelClientFromEnv();
  const ids = process.argv.slice(2);
  const scenarios =
    ids.length > 0
      ? STANDARD_SCENARIOS.filter((s) => ids.includes(s.id))
      : STANDARD_SCENARIOS.filter((s) => ["S01", "S03", "S06", "S09", "S10"].includes(s.id));

  for (const scenario of scenarios) {
    const session = createSession();
    console.log(`\n=== ${scenario.id} (${config.toolBackend}) ===`);
    console.log(scenario.userPrompt);
    const result = await runAgentTurn(session, scenario.userPrompt, {
      model,
      capabilities,
      logger,
      maxIterations: config.maxIterations,
      turnTimeoutMs: config.turnTimeoutMs,
    });
    const forbidden = assertNoForbiddenClaims(result.assistantText, scenario.forbiddenClaims);
    console.log(result.assistantText);
    console.log(`tools: ${result.toolNamesUsed.join(", ") || "(none)"}`);
    console.log(forbidden.length ? `FORBIDDEN HITS: ${forbidden.join(" | ")}` : "forbidden claims: none matched literally");
  }

  logger.log("run.completed", { scenarios: scenarios.map((s) => s.id) });
  console.log(`\nLog: ${logger.filePath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
