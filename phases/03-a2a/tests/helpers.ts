import net from "node:net";
import { createPhaseLogger } from "@northstar/logger";
import type { ModelClient } from "@northstar/model-client";
import { loadConfig, type A2aConfig, type SpecialistId } from "../src/config.js";
import { discoverSpecialists, type SpecialistClients } from "../src/orchestrator/delegation.js";
import {
  startSpecialistServer,
  type SpecialistRuntime,
} from "../src/specialists/create-server.js";

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("No port"));
        return;
      }
      const port = address.port;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

export async function startTestCluster(options: {
  models: Record<SpecialistId, ModelClient>;
  capabilityBackend?: "mcp-direct" | "mcp-rest";
  restBaseUrl?: string;
}): Promise<{
  config: A2aConfig;
  runtimes: SpecialistRuntime[];
  clients: SpecialistClients;
  orchLogger: ReturnType<typeof createPhaseLogger>;
  close: () => Promise<void>;
}> {
  const billing = await freePort();
  const service = await freePort();
  const contract = await freePort();

  const config = loadConfig({
    A2A_CAPABILITY_BACKEND: options.capabilityBackend ?? "mcp-direct",
    A2A_BILLING_PORT: String(billing),
    A2A_SERVICE_PORT: String(service),
    A2A_CONTRACT_PORT: String(contract),
    A2A_HOST: "127.0.0.1",
    NORTHSTAR_REST_BASE_URL: options.restBaseUrl,
  });

  const orchLogger = createPhaseLogger({
    phase: "03-a2a",
    component: "orchestrator",
    logDir: config.logDir,
    fileName: `test-orch-${Date.now()}.jsonl`,
    logRunStarted: false,
  });

  const runtimes: SpecialistRuntime[] = [];
  for (const id of ["billing", "service", "contract"] as const) {
    const runtime = await startSpecialistServer({
      id,
      config,
      model: options.models[id],
      runId: orchLogger.runId,
    });
    runtimes.push(runtime);
  }

  const clients = await discoverSpecialists(config, orchLogger);

  return {
    config,
    runtimes,
    clients,
    orchLogger,
    close: async () => {
      for (const runtime of runtimes) {
        await runtime.close();
      }
    },
  };
}
