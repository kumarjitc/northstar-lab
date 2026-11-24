import { NorthstarDataStore } from "@northstar/data-access";
import { createDomainServices } from "@northstar/domain-services";
import { createRestCapabilities } from "@northstar/rest-client";
import type { CapabilitySet } from "@northstar/capability-contracts";
import type { JsonlLogger } from "@northstar/logger";
import type { AgenticConfig } from "../config.js";
import { createDirectCapabilities } from "./direct.js";

export function createCapabilities(
  config: AgenticConfig,
  logger?: JsonlLogger,
): CapabilitySet {
  if (config.toolBackend === "rest") {
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

  const store = NorthstarDataStore.load({ dataDir: config.dataDir });
  const services = createDomainServices({
    store,
    knowledgeDir: config.knowledgeDir,
  });
  return createDirectCapabilities(services);
}
