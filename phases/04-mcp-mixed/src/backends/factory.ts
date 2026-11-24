import { NorthstarDataStore } from "@northstar/data-access";
import { createDomainServices } from "@northstar/domain-services";
import { createRestCapabilities } from "@northstar/rest-client";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { JsonlLogger } from "@northstar/logger";
import type { MixedConfig } from "../config.js";
import { createDirectCapabilities } from "./direct.js";

export async function assertRestAvailable(baseUrl: string, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Phase 0 REST health check failed with HTTP ${res.status}`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Contract REST path requires a running Phase 0 API at ${baseUrl}. ` +
        `Start it with \`npm run rest\`. (${detail})`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Direct CapabilitySet for the Service A2A agent (option a). */
export function createServiceDirectCapabilities(config: MixedConfig): CapabilitySet {
  const store = NorthstarDataStore.load({ dataDir: config.dataDir });
  const services = createDomainServices({
    store,
    knowledgeDir: config.knowledgeDir,
  });
  return createDirectCapabilities(services);
}

/** Contract domain: REST → Phase 0 only. */
export async function createContractRestCapabilities(
  config: MixedConfig,
  logger?: JsonlLogger,
): Promise<CapabilitySet> {
  await assertRestAvailable(config.restBaseUrl, config.restTimeoutMs);
  return createRestCapabilities({
    baseUrl: config.restBaseUrl,
    timeoutMs: config.restTimeoutMs,
    onRequest: (info) => {
      logger?.log("rest.client.request.started", info);
    },
    onResponse: (info) => {
      logger?.log(
        info.status === 0 ? "rest.client.request.failed" : "rest.client.request.completed",
        info,
        { durationMs: info.durationMs, level: info.status === 0 ? "ERROR" : "INFO" },
      );
    },
  });
}
