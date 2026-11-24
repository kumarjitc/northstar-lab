import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const phaseRoot = path.resolve(here, "..");
const repoRoot = path.resolve(here, "../../..");

export type A2aCapabilityBackend = "mcp-direct" | "mcp-rest";

export type SpecialistId = "billing" | "service" | "contract";

export type A2aConfig = {
  capabilityBackend: A2aCapabilityBackend;
  mcpToolBackend: "direct" | "rest";
  restBaseUrl: string;
  restTimeoutMs: number;
  dataDir: string;
  knowledgeDir: string;
  logDir: string;
  maxIterations: number;
  turnTimeoutMs: number;
  a2aTimeoutMs: number;
  mcpCallTimeoutMs: number;
  repoRoot: string;
  phaseRoot: string;
  mcpServerEntry: string;
  ports: Record<SpecialistId, number>;
  host: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): A2aConfig {
  const backend = (env.A2A_CAPABILITY_BACKEND ?? "mcp-direct").toLowerCase();
  if (backend !== "mcp-direct" && backend !== "mcp-rest") {
    throw new Error(
      `Invalid A2A_CAPABILITY_BACKEND=${backend}. Use mcp-direct or mcp-rest (never bare rest).`,
    );
  }

  return {
    capabilityBackend: backend,
    mcpToolBackend: backend === "mcp-rest" ? "rest" : "direct",
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
      : path.join(repoRoot, "phases/03-a2a/logs"),
    maxIterations: Number(env.AGENT_MAX_ITERATIONS ?? 8),
    turnTimeoutMs: Number(env.AGENT_TURN_TIMEOUT_MS ?? 60000),
    a2aTimeoutMs: Number(env.A2A_TIMEOUT_MS ?? 45000),
    mcpCallTimeoutMs: Number(env.MCP_CALL_TIMEOUT_MS ?? 15000),
    repoRoot,
    phaseRoot,
    mcpServerEntry: path.join(repoRoot, "phases/02-mcp/src/server/main.ts"),
    ports: {
      billing: Number(env.A2A_BILLING_PORT ?? 4101),
      service: Number(env.A2A_SERVICE_PORT ?? 4102),
      contract: Number(env.A2A_CONTRACT_PORT ?? 4103),
    },
    host: env.A2A_HOST ?? "127.0.0.1",
  };
}

export function specialistBaseUrl(config: A2aConfig, id: SpecialistId): string {
  return `http://${config.host}:${config.ports[id]}`;
}

export function specialistCardUrl(config: A2aConfig, id: SpecialistId): string {
  return `${specialistBaseUrl(config, id)}/.well-known/agent-card.json`;
}
