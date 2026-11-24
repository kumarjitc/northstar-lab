import { randomUUID } from "node:crypto";
import type { ChatMessage } from "@northstar/model-client";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "./system-prompt.js";

export type OrchestratorSession = {
  sessionId: string;
  messages: ChatMessage[];
  turnCount: number;
  createdAt: string;
};

export function createOrchestratorSession(): OrchestratorSession {
  return {
    sessionId: `session_${randomUUID()}`,
    messages: [{ role: "system", content: ORCHESTRATOR_SYSTEM_PROMPT }],
    turnCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export function resetOrchestratorSession(): OrchestratorSession {
  return createOrchestratorSession();
}
