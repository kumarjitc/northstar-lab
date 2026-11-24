#!/usr/bin/env node
import { createModelClientFromEnv } from "@northstar/model-client";
import { loadConfig } from "../../config.js";
import { loadEnvFiles } from "../../load-env.js";
import { startSpecialistServer } from "../create-server.js";

async function main(): Promise<void> {
  loadEnvFiles();
  const config = loadConfig();
  const model = createModelClientFromEnv();
  await startSpecialistServer({
    id: "contract",
    config,
    model,
    runId: process.env.A2A_PARENT_RUN_ID,
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
