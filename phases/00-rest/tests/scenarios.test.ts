import { beforeAll, describe, expect, it } from "vitest";
import { JsonlLogger, readJsonl } from "@northstar/logger";
import { assertNoForbiddenClaims } from "@northstar/scenario-kit";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { runCust1005PaymentRestriction } from "../src/scenarios/scenario-cust-1005.js";
import { runCust1008ActivationContract } from "../src/scenarios/scenario-cust-1008.js";
import { runCust1010RouterDispute } from "../src/scenarios/scenario-cust-1010.js";
import { runS01 } from "../src/scenarios/scenario-s01.js";
import { runS10PatelAmbiguity } from "../src/scenarios/scenario-s10.js";
import type { ScenarioContext } from "../src/scenarios/types.js";

describe("Phase 0 deterministic scenarios", () => {
  let ctx: ScenarioContext;
  let logFile: string;

  beforeAll(async () => {
    const config = loadConfig();
    const logger = new JsonlLogger({
      logDir: config.logDir,
      phase: "00-rest",
      component: "scenario-test",
      fileName: `test-scenarios-${Date.now()}.jsonl`,
    });
    logFile = logger.filePath;
    const built = await buildApp(config, logger);
    ctx = { services: built.ctx.services, logger };
  });

  it("S01 returns Fibre 150 / UP", async () => {
    const result = await runS01(ctx);
    expect(result.conclusion).toMatch(/Fibre 150/i);
    expect(result.conclusion).toMatch(/\bUP\b/);
    expect(assertNoForbiddenClaims(result.conclusion, result.forbiddenClaimsAvoided)).toEqual([]);
  });

  it("CUST-1005 pending payment + access restriction", async () => {
    const result = await runCust1005PaymentRestriction(ctx);
    expect(result.steps.join(" ")).toMatch(/services/i);
    expect(result.steps.join(" ")).toMatch(/billing-account/i);
    expect(result.steps.join(" ")).toMatch(/payments/i);
    expect(result.steps.join(" ")).toMatch(/billing-cases/i);
    expect(result.steps.join(" ")).toMatch(/faults/i);
    expect(result.conclusion).toMatch(/FAILED/i);
    expect(result.conclusion).toMatch(/PENDING/i);
    expect(result.conclusion).toMatch(/BLOCKED|restriction/i);
    expect(result.conclusion).toMatch(/not indicated/i);
    expect(result.conclusion).not.toMatch(/reconnected today/i);
    expect(assertNoForbiddenClaims(result.conclusion, result.forbiddenClaimsAvoided)).toEqual([]);
  });

  it("CUST-1008 does not invent bill total or contract end", async () => {
    const result = await runCust1008ActivationContract(ctx);
    expect(result.conclusion).toMatch(/NOT_STARTED/i);
    expect(result.conclusion).toMatch(/unavailable|null/i);
    expect(result.conclusion).toMatch(/PENDING_GENERATION/i);
    expect(result.conclusion).not.toMatch(/£310/);
    expect(result.conclusion.toLowerCase()).not.toMatch(/contract ends on \d{4}/);
    expect(assertNoForbiddenClaims(result.conclusion, result.forbiddenClaimsAvoided)).toEqual([]);
  });

  it("CUST-1010 does not treat replacement order as fee proof", async () => {
    const result = await runCust1010RouterDispute(ctx);
    expect(result.conclusion).toMatch(/34\.99/);
    expect(result.conclusion).toMatch(/does not prove/i);
    expect(result.conclusion).toMatch(/unresolved/i);
    expect(assertNoForbiddenClaims(result.conclusion, result.forbiddenClaimsAvoided)).toEqual([]);
  });

  it("S10 asks for clarification on Patel", async () => {
    const result = await runS10PatelAmbiguity(ctx);
    expect(result.conclusion).toMatch(/Multiple customers/i);
    expect(result.conclusion).toMatch(/Clarification/i);
    expect(result.conclusion).not.toMatch(/SVC-/);
    expect(assertNoForbiddenClaims(result.conclusion, result.forbiddenClaimsAvoided)).toEqual([]);
  });

  it("JSONL trace reconstructs scenario steps", async () => {
    const events = readJsonl(logFile);
    const stepEvents = events.filter((e) => e.event === "scenario.step");
    expect(stepEvents.length).toBeGreaterThan(5);
    expect(events.some((e) => e.event === "scenario.decision")).toBe(true);
    expect(events.some((e) => e.event === "scenario.completed")).toBe(true);
  });
});
