import { JsonlLogger } from "@northstar/logger";
import { assertNoForbiddenClaims } from "@northstar/scenario-kit";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { runCust1005PaymentRestriction } from "./scenario-cust-1005.js";
import { runCust1008ActivationContract } from "./scenario-cust-1008.js";
import { runCust1010RouterDispute } from "./scenario-cust-1010.js";
import { runS01 } from "./scenario-s01.js";
import { runS10PatelAmbiguity } from "./scenario-s10.js";
import type { ScenarioResult } from "./types.js";

async function main() {
  const config = loadConfig();
  const logger = new JsonlLogger({
    logDir: config.logDir,
    phase: "00-rest",
    component: "scenarios",
  });
  logger.log("run.started", { mode: "deterministic-scenarios" });

  const { ctx } = await buildApp(config, logger);
  const scenarioCtx = { services: ctx.services, logger };

  const results: ScenarioResult[] = [];
  for (const runner of [
    runS01,
    runCust1005PaymentRestriction,
    runCust1008ActivationContract,
    runCust1010RouterDispute,
    runS10PatelAmbiguity,
  ]) {
    const result = await runner(scenarioCtx);
    const forbiddenHits = assertNoForbiddenClaims(result.conclusion, result.forbiddenClaimsAvoided);
    if (forbiddenHits.length > 0) {
      throw new Error(`Scenario ${result.id} produced forbidden claims: ${forbiddenHits.join(", ")}`);
    }
    results.push(result);
    console.log(`\n=== ${result.id}: ${result.title} ===`);
    console.log(result.conclusion);
    console.log(`Steps: ${result.steps.join(" -> ")}`);
  }

  logger.log("run.completed", {
    scenarios: results.map((r) => r.id),
    logFile: logger.filePath,
  });
  console.log(`\nScenario log: ${logger.filePath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
