import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CapabilityBackend } from "@northstar/capability-contracts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

export type AgenticConfig = {
  toolBackend: CapabilityBackend;
  restBaseUrl: string;
  restTimeoutMs: number;
  dataDir: string;
  knowledgeDir: string;
  logDir: string;
  maxIterations: number;
  turnTimeoutMs: number;
  repoRoot: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgenticConfig {
  const backend = (env.TOOL_BACKEND ?? "direct").toLowerCase();
  if (backend !== "direct" && backend !== "rest") {
    throw new Error(`Invalid TOOL_BACKEND=${backend}. Use direct or rest.`);
  }

  const config: AgenticConfig = {
    toolBackend: backend,
    restBaseUrl: env.NORTHSTAR_REST_BASE_URL ?? "http://127.0.0.1:3000",
    restTimeoutMs: Number(env.REST_REQUEST_TIMEOUT_MS ?? 5000),
    dataDir: env.NORTHSTAR_DATA_DIR
      ? path.resolve(env.NORTHSTAR_DATA_DIR)
      : path.join(repoRoot, "shared/data"),
    knowledgeDir: env.NORTHSTAR_KNOWLEDGE_DIR
      ? path.resolve(env.NORTHSTAR_KNOWLEDGE_DIR)
      : path.join(repoRoot, "shared/knowledge"),
    logDir: env.LOG_DIR
      ? path.resolve(env.LOG_DIR)
      : path.join(repoRoot, "phases/01-agentic/logs"),
    maxIterations: Number(env.AGENT_MAX_ITERATIONS ?? 6),
    turnTimeoutMs: Number(env.AGENT_TURN_TIMEOUT_MS ?? 30000),
    repoRoot,
  };

  if (config.toolBackend === "rest" && !config.restBaseUrl) {
    throw new Error("NORTHSTAR_REST_BASE_URL is required when TOOL_BACKEND=rest");
  }

  return config;
}
