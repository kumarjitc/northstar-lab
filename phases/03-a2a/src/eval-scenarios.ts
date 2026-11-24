/**
 * Optional live eval for CUST-1010. Deterministic CI uses MockModelClient tests.
 */
import { createPhaseLogger } from "@northstar/logger";
import { createModelClientFromEnv } from "@northstar/model-client";
import { loadConfig } from "./config.js";
import { loadEnvFiles } from "./load-env.js";
import { discoverSpecialists } from "./orchestrator/delegation.js";
import { runOrchestratorTurn } from "./orchestrator/loop.js";
import { createOrchestratorSession } from "./orchestrator/session.js";
import { startSpecialistProcesses } from "./process/start-specialists.js";

const PROMPT =
  "CUST-1010 reports a restarting router. A replacement is ordered, £34.99 appears on the bill, and the customer says the replacement was promised free. Explain the situation and what should happen next.";

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();
  const logger = createPhaseLogger({
    phase: "03-a2a",
    component: "a2a-eval",
    logDir: config.logDir,
    runStartedData: { a2aCapabilityBackend: config.capabilityBackend, mode: "cust-1010-eval" },
  });

  const procs = await startSpecialistProcesses(config);
  try {
    const clients = await discoverSpecialists(config, logger);
    const model = createModelClientFromEnv();
    const result = await runOrchestratorTurn(createOrchestratorSession(), PROMPT, {
      model,
      clients,
      config,
      logger,
    });
    console.log(result.assistantText);
    console.log(
      "delegations:",
      result.delegations.map((d) => `${d.specialist}:${d.ok ? "ok" : "fail"}`).join(", "),
    );
  } finally {
    await procs.stop();
    logger.log("run.completed", { reason: "eval_finished" });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
