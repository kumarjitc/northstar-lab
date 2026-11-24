import { randomUUID } from "node:crypto";
import type { ChatMessage } from "@northstar/model-client";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export type SessionState = {
  sessionId: string;
  messages: ChatMessage[];
  turnCount: number;
  createdAt: string;
};

export function createSession(): SessionState {
  return {
    sessionId: `session_${randomUUID()}`,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    turnCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export function resetSession(_previous?: SessionState): SessionState {
  return createSession();
}

export function describeSession(session: SessionState): string {
  const nonSystem = session.messages.filter((m) => m.role !== "system");
  return [
    `sessionId=${session.sessionId}`,
    `turnCount=${session.turnCount}`,
    `messages=${nonSystem.length} (excluding system)`,
    `createdAt=${session.createdAt}`,
  ].join("\n");
}
