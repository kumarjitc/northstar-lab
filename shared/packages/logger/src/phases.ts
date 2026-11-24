import fs from "node:fs";
import path from "node:path";

/** Canonical phase ids used in JSONL `phase` fields and log folders. */
export const NORTHSTAR_PHASES = [
  "00-rest",
  "01-agentic",
  "02-mcp",
  "03-a2a",
  "04-mcp-mixed",
] as const;

export type NorthstarPhase = (typeof NORTHSTAR_PHASES)[number];

export const PHASE_LOG_EVENTS = {
  shared: [
    "run.started",
    "run.completed",
    "capability.backend.selected",
  ],
  rest: [
    "http.request.started",
    "http.request.completed",
    "http.request.failed",
    "scenario.step",
    "scenario.decision",
    "scenario.completed",
    "server.listening",
  ],
  agentic: [
    "user.message.received",
    "model.requested",
    "model.responded",
    "tool.requested",
    "tool.started",
    "tool.completed",
    "tool.failed",
    "agent.iteration.completed",
    "assistant.response.sent",
  ],
  mcp: [
    "mcp.client.connected",
    "mcp.tools.listed",
    "mcp.tool.requested",
    "mcp.tool.completed",
    "mcp.resource.read",
    "mcp.server.request.received",
    "mcp.server.tool.executed",
    "mcp.server.response.sent",
  ],
  a2a: [
    "a2a.agent.discovered",
    "a2a.task.created",
    "a2a.task.completed",
    "a2a.task.failed",
    "a2a.delegation.started",
    "a2a.delegation.completed",
    "a2a.synthesis.completed",
  ],
  mixed: [
    "mixed.route.executed",
    "mixed.billing.mcp.proxied",
    "mixed.service.a2a.delegated",
    "mixed.contract.rest.called",
  ],
} as const;

export function isNorthstarPhase(value: string): value is NorthstarPhase {
  return (NORTHSTAR_PHASES as readonly string[]).includes(value);
}

export function defaultLogDirForPhase(
  phase: NorthstarPhase,
  repoRoot = process.cwd(),
): string {
  return path.resolve(repoRoot, "phases", phase, "logs");
}

export function discoverPhaseLogDirs(repoRoot = process.cwd()): Array<{
  phase: string;
  dir: string;
}> {
  const phasesRoot = path.resolve(repoRoot, "phases");
  if (!fs.existsSync(phasesRoot)) return [];

  return fs
    .readdirSync(phasesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = path.join(phasesRoot, d.name, "logs");
      return { phase: d.name, dir };
    })
    .filter((entry) => fs.existsSync(entry.dir));
}

/** Ensure every known phase has a logs directory ready for the same logger style. */
export function ensurePhaseLogDirs(repoRoot = process.cwd()): string[] {
  const created: string[] = [];
  for (const phase of NORTHSTAR_PHASES) {
    const dir = defaultLogDirForPhase(phase, repoRoot);
    fs.mkdirSync(dir, { recursive: true });
    const keep = path.join(dir, ".gitkeep");
    if (!fs.existsSync(keep)) fs.writeFileSync(keep, "");
    created.push(dir);
  }
  return created;
}
