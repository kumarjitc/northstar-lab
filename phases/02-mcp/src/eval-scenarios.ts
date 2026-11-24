/**
 * Optional live eval against a real model. Deterministic CI uses MockModelClient tests.
 */
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import { getScenario } from "@northstar/scenario-kit";
import { connectMcpSession } from "./client/mcp-session.js";
import { runAgentTurn } from "./client/loop.js";
import { createSession } from "./client/session.js";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";

const SCENARIO_IDS = ["S03", "S06", "S09"] as const;

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "02-mcp",
    component: "mcp-eval",
    logDir: config.logDir,
    runStartedData: { mcpToolBackend: config.mcpToolBackend, mode: "scenario-eval" },
  });
  logger.log("capability.backend.selected", { capabilityBackend: config.mcpToolBackend });

  const mcp = await connectMcpSession({ config, logger });
  const model = createModelClientFromEnv();

  try {
    for (const id of SCENARIO_IDS) {
      const scenario = getScenario(id);
      if (!scenario) continue;
      console.log(`\n=== ${id} (${config.mcpToolBackend}) ===`);
      console.log(`prompt: ${scenario.userPrompt}`);
      const result = await runAgentTurn(createSession(), scenario.userPrompt, {
        model,
        mcp,
        logger,
        maxIterations: config.maxIterations,
        turnTimeoutMs: config.turnTimeoutMs,
        mcpCallTimeoutMs: config.mcpCallTimeoutMs,
      });
      console.log(`agent> ${result.assistantText}`);
      console.log(`tools: ${result.toolNamesUsed.join(", ") || "(none)"}`);
    }
  } finally {
    await mcp.close();
    logger.log("run.completed", { reason: "eval_finished" });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
