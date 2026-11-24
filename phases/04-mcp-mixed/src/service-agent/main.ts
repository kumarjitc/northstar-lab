#!/usr/bin/env node
import { createModelClientFromEnv } from "@northstar/model-client";
import { loadConfig } from "../config.js";
import { loadEnvFiles } from "../load-env.js";
import { startServiceAgent } from "./create-server.js";

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();
  const model = createModelClientFromEnv();
  await startServiceAgent({
    config,
    model,
    runId: process.env.MIXED_PARENT_RUN_ID,
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
