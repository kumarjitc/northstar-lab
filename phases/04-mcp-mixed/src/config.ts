import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const phaseRoot = path.resolve(here, "..");
const repoRoot = path.resolve(here, "../../..");

export type BillingMcpBackend = "direct" | "rest";

export type MixedConfig = {
  billingMcpBackend: BillingMcpBackend;
  restBaseUrl: string;
  restTimeoutMs: number;
  dataDir: string;
  knowledgeDir: string;
  logDir: string;
  maxIterations: number;
  turnTimeoutMs: number;
  mcpCallTimeoutMs: number;
  a2aTimeoutMs: number;
  serviceHost: string;
  servicePort: number;
  repoRoot: string;
  phaseRoot: string;
  /** Phase 2 MCP server entry (subprocess — no TS import of 02 sources). */
  billingMcpServerEntry: string;
  facadeEntry: string;
  serviceAgentEntry: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MixedConfig {
  const billing = (env.MIXED_BILLING_MCP_BACKEND ?? "direct").toLowerCase();
  if (billing !== "direct" && billing !== "rest") {
    throw new Error(`Invalid MIXED_BILLING_MCP_BACKEND=${billing}. Use direct or rest.`);
  }

  return {
    billingMcpBackend: billing,
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
      : path.join(repoRoot, "phases/04-mcp-mixed/logs"),
    maxIterations: Number(env.AGENT_MAX_ITERATIONS ?? 8),
    turnTimeoutMs: Number(env.AGENT_TURN_TIMEOUT_MS ?? 60000),
    mcpCallTimeoutMs: Number(env.MCP_CALL_TIMEOUT_MS ?? 20000),
    a2aTimeoutMs: Number(env.MIXED_A2A_TIMEOUT_MS ?? 20000),
    serviceHost: env.MIXED_SERVICE_HOST ?? "127.0.0.1",
    servicePort: Number(env.MIXED_SERVICE_PORT ?? 4202),
    repoRoot,
    phaseRoot,
    billingMcpServerEntry: path.join(repoRoot, "phases/02-mcp/src/server/main.ts"),
    facadeEntry: path.join(phaseRoot, "src/facade/main.ts"),
    serviceAgentEntry: path.join(phaseRoot, "src/service-agent/main.ts"),
  };
}

export function serviceBaseUrl(config: MixedConfig): string {
  return `http://${config.serviceHost}:${config.servicePort}`;
}

export function serviceCardUrl(config: MixedConfig): string {
  return `${serviceBaseUrl(config)}/.well-known/agent-card.json`;
}
