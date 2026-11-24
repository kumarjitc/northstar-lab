import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import type { MixedConfig } from "../config.js";
import { serviceCardUrl } from "../config.js";

const require = createRequire(import.meta.url);

function resolveTsxCli(): string {
  try {
    return require.resolve("tsx/cli");
  } catch {
    return "tsx";
  }
}

export type ServiceAgentProcess = {
  child: ChildProcess;
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
  throw new Error(`Timed out waiting for service agent card ${url}: ${lastError}`);
}

export async function startServiceAgentProcess(
  config: MixedConfig,
  envExtra: Record<string, string> = {},
): Promise<ServiceAgentProcess> {
  const child = spawn(
    process.execPath,
    [resolveTsxCli(), path.join(config.phaseRoot, "src/service-agent/main.ts")],
    {
      cwd: config.phaseRoot,
      env: {
        ...process.env,
        MIXED_SERVICE_HOST: config.serviceHost,
        MIXED_SERVICE_PORT: String(config.servicePort),
        NORTHSTAR_DATA_DIR: config.dataDir,
        NORTHSTAR_KNOWLEDGE_DIR: config.knowledgeDir,
        LOG_DIR: config.logDir,
        ...envExtra,
      },
      stdio: ["ignore", "inherit", "inherit"],
    },
  );

  try {
    await waitForCard(serviceCardUrl(config), 30000);
  } catch (error) {
    await stopChild(child);
    throw error;
  }

  return {
    child,
    stop: async () => stopChild(child),
  };
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.killed || child.exitCode != null) return;
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      resolve();
    }, 2000);
  });
}
