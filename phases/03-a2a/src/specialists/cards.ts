import type { AgentCard } from "@a2a-js/sdk";
import type { A2aConfig, SpecialistId } from "../config.js";
import { specialistBaseUrl } from "../config.js";

const DESCRIPTIONS: Record<SpecialistId, { name: string; description: string; skill: string }> = {
  billing: {
    name: "Northstar Billing Agent",
    description:
      "Owns bills, balances, payments, billing cases/disputes and billing knowledge. Cannot fabricate dispute outcomes.",
    skill: "billing-evidence",
  },
  service: {
    name: "Northstar Service Agent",
    description:
      "Owns services, faults, incidents, orders/activation and fault knowledge. Cannot promise reconnection.",
    skill: "service-evidence",
  },
  contract: {
    name: "Northstar Contract Agent",
    description:
      "Owns contracts, contract events, offers and contractual interpretation. Cannot compute unsupported ETC.",
    skill: "contract-evidence",
  },
};

export function buildAgentCard(config: A2aConfig, id: SpecialistId): AgentCard {
  const meta = DESCRIPTIONS[id];
  const url = specialistBaseUrl(config, id);
  return {
    name: meta.name,
    description: meta.description,
    protocolVersion: "0.3.0",
    version: "0.1.0",
    url,
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
        id: meta.skill,
        name: meta.skill,
        description: meta.description,
        tags: ["northstar", id, "mcp"],
        examples: [`Provide ${id} evidence for customer CUST-1010`],
      },
    ],
  };
}
