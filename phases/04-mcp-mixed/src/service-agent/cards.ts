import type { AgentCard } from "@a2a-js/sdk";
import type { MixedConfig } from "../config.js";
import { serviceBaseUrl } from "../config.js";

export function buildServiceAgentCard(config: MixedConfig): AgentCard {
  return {
    name: "Northstar Service Agent",
    description:
      "Owns services, faults, incidents, and orders. Uses direct CapabilitySet tools (not MCP).",
    protocolVersion: "0.3.0",
    version: "0.1.0",
    url: serviceBaseUrl(config),
    preferredTransport: "JSONRPC",
    provider: { organization: "Northstar Agent Lab", url: "https://example.test/northstar" },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json"],
    skills: [
      {
        id: "service-evidence",
        name: "service-evidence",
        description: "Service / fault / order evidence for support orchestration",
        tags: ["northstar", "service", "direct-tools"],
        examples: ["Why is CUST-1005 blocked on the service side?"],
      },
    ],
  };
}
