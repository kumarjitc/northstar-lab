import type { DomainServices } from "@northstar/domain-services";
import type { JsonlLogger } from "@northstar/logger";

export type ScenarioContext = {
  services: DomainServices;
  logger: JsonlLogger;
};

export type ScenarioResult = {
  id: string;
  title: string;
  steps: string[];
  decisions: string[];
  conclusion: string;
  supportedFacts: string[];
  forbiddenClaimsAvoided: string[];
};
