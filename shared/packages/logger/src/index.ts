import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogEvent = {
  timestamp: string;
  level: LogLevel;
  phase: string;
  component: string;
  event: string;
  runId?: string;
  sessionId?: string;
  turnId?: string;
  requestId?: string;
  modelCallId?: string;
  toolCallId?: string;
  mcpRequestId?: string;
  taskId?: string;
  a2aTaskId?: string;
  correlation?: Record<string, string>;
  durationMs?: number;
  data?: unknown;
};

const SECRET_KEYS = /^(authorization|api[_-]?key|password|secret|token|cookie)$/i;
const MAX_PAYLOAD_CHARS = 4000;

export function createIds() {
  return {
    runId: `run_${randomUUID()}`,
    sessionId: `session_${randomUUID()}`,
    turnId: `turn_${randomUUID()}`,
    requestId: `req_${randomUUID()}`,
  };
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) ? "[REDACTED]" : redact(v);
    }
    return out;
  }
  return value;
}

export function truncate(value: unknown, maxChars = MAX_PAYLOAD_CHARS): unknown {
  const json = JSON.stringify(value);
  if (json === undefined) return value;
  if (json.length <= maxChars) return value;
  return {
    truncated: true,
    originalLength: json.length,
    preview: json.slice(0, maxChars),
  };
}

export class JsonlLogger {
  readonly filePath: string;
  readonly phase: string;
  readonly component: string;
  readonly runId: string;

  constructor(options: {
    logDir: string;
    phase: string;
    component: string;
    runId?: string;
    fileName?: string;
    filePath?: string;
  }) {
    this.phase = options.phase;
    this.component = options.component;
    this.runId = options.runId ?? `run_${randomUUID()}`;
    if (options.filePath) {
      this.filePath = options.filePath;
    } else {
      fs.mkdirSync(options.logDir, { recursive: true });
      const fileName = options.fileName ?? `${this.runId}.jsonl`;
      this.filePath = path.join(options.logDir, fileName);
    }
  }

  child(component: string): JsonlLogger {
    return new JsonlLogger({
      logDir: path.dirname(this.filePath),
      phase: this.phase,
      component,
      runId: this.runId,
      filePath: this.filePath,
    });
  }

  log(
    event: string,
    data?: unknown,
    extras?: Partial<Omit<LogEvent, "timestamp" | "level" | "phase" | "component" | "event" | "data">> & {
      level?: LogLevel;
    },
  ): void {
    const entry: LogEvent = {
      timestamp: new Date().toISOString(),
      level: extras?.level ?? "INFO",
      phase: this.phase,
      component: this.component,
      event,
      runId: extras?.runId ?? this.runId,
      sessionId: extras?.sessionId,
      turnId: extras?.turnId,
      requestId: extras?.requestId,
      modelCallId: extras?.modelCallId,
      toolCallId: extras?.toolCallId,
      mcpRequestId: extras?.mcpRequestId,
      taskId: extras?.taskId,
      a2aTaskId: extras?.a2aTaskId,
      correlation: extras?.correlation,
      durationMs: extras?.durationMs,
      data: data === undefined ? undefined : truncate(redact(data)),
    };
    fs.appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");
  }
}

export function durationMs(startedAt: number): number {
  return Date.now() - startedAt;
}

export function readJsonl(filePath: string): LogEvent[] {
  const text = fs.readFileSync(filePath, "utf8");
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LogEvent);
}

export {
  buildTraceNodes,
  formatTraceAscii,
  formatTraceHtml,
  type TraceKind,
  type TraceNode,
} from "./trace-graph.js";

export {
  collectRunIds,
  listSiblingRunLogs,
  peekRunId,
  readMergedRunLogs,
  runLogPrefix,
} from "./merge-run-logs.js";

export {
  NORTHSTAR_PHASES,
  PHASE_LOG_EVENTS,
  defaultLogDirForPhase,
  discoverPhaseLogDirs,
  ensurePhaseLogDirs,
  isNorthstarPhase,
  type NorthstarPhase,
} from "./phases.js";

export { createPhaseLogger, type PhaseLoggerOptions } from "./phase-logger.js";

export function formatLogEvent(event: LogEvent): string {
  const ids = [
    event.runId,
    event.requestId,
    event.sessionId,
    event.turnId,
    event.toolCallId,
    event.mcpRequestId,
    event.a2aTaskId,
  ]
    .filter(Boolean)
    .join(" ");
  const duration = event.durationMs !== undefined ? ` ${event.durationMs}ms` : "";
  const data =
    event.data === undefined ? "" : ` ${typeof event.data === "string" ? event.data : JSON.stringify(event.data)}`;
  return `[${event.timestamp}] ${event.level} ${event.phase}/${event.component} ${event.event}${duration}${ids ? ` (${ids})` : ""}${data}`;
}
