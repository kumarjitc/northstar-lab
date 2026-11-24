import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import type { A2aConfig, SpecialistId } from "../config.js";
import { specialistCardUrl } from "../config.js";

const require = createRequire(import.meta.url);

function resolveTsxCli(): string {
  try {
    return require.resolve("tsx/cli");
  } catch {
    return "tsx";
  }
}

const ENTRY: Record<SpecialistId, string> = {
  billing: "src/specialists/billing/main.ts",
  service: "src/specialists/service/main.ts",
  contract: "src/specialists/contract/main.ts",
};

export type SpecialistProcesses = {
  children: ChildProcess[];
  stop: () => Promise<void>;
};

async function waitForCard(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for agent card ${url}: ${lastError}`);
}

export async function startSpecialistProcesses(
  config: A2aConfig,
  envExtra: Record<string, string> = {},
): Promise<SpecialistProcesses> {
  const children: ChildProcess[] = [];
  const ids: SpecialistId[] = ["billing", "service", "contract"];

  for (const id of ids) {
    const child = spawn(
      process.execPath,
      [resolveTsxCli(), path.join(config.phaseRoot, ENTRY[id])],
      {
        cwd: config.phaseRoot,
        env: {
          ...process.env,
          A2A_CAPABILITY_BACKEND: config.capabilityBackend,
          A2A_BILLING_PORT: String(config.ports.billing),
          A2A_SERVICE_PORT: String(config.ports.service),
          A2A_CONTRACT_PORT: String(config.ports.contract),
          A2A_HOST: config.host,
          NORTHSTAR_REST_BASE_URL: config.restBaseUrl,
          NORTHSTAR_DATA_DIR: config.dataDir,
          NORTHSTAR_KNOWLEDGE_DIR: config.knowledgeDir,
          LOG_DIR: config.logDir,
          ...envExtra,
        },
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
    children.push(child);
  }

  try {
    await Promise.all(
      ids.map((id) => waitForCard(specialistCardUrl(config, id), 30000)),
    );
  } catch (error) {
    await stopChildren(children);
    throw error;
  }

  return {
    children,
    stop: async () => stopChildren(children),
  };
}

async function stopChildren(children: ChildProcess[]): Promise<void> {
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.killed || child.exitCode != null) {
            resolve();
            return;
          }
          child.once("exit", () => resolve());
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
            resolve();
          }, 2000);
        }),
    ),
  );
}
