import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

export type RestConfig = {
  port: number;
  host: string;
  dataDir: string;
  knowledgeDir: string;
  logDir: string;
  repoRoot: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RestConfig {
  return {
    port: Number(env.REST_PORT ?? 3000),
    host: env.REST_HOST ?? "127.0.0.1",
    dataDir: env.NORTHSTAR_DATA_DIR
      ? path.resolve(env.NORTHSTAR_DATA_DIR)
      : path.join(repoRoot, "shared/data"),
    knowledgeDir: env.NORTHSTAR_KNOWLEDGE_DIR
      ? path.resolve(env.NORTHSTAR_KNOWLEDGE_DIR)
      : path.join(repoRoot, "shared/knowledge"),
    logDir: env.LOG_DIR
      ? path.resolve(env.LOG_DIR)
      : path.join(repoRoot, "phases/00-rest/logs"),
    repoRoot,
  };
}
