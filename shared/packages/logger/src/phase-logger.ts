import path from "node:path";
import { JsonlLogger } from "./index.js";
import {
  defaultLogDirForPhase,
  type NorthstarPhase,
} from "./phases.js";

export type PhaseLoggerOptions = {
  phase: NorthstarPhase;
  component: string;
  /** Defaults to `phases/<phase>/logs` under cwd. */
  logDir?: string;
  runId?: string;
  fileName?: string;
  /** Optional startup payload; always logs `run.started` when true (default). */
  logRunStarted?: boolean;
  runStartedData?: Record<string, unknown>;
};

/**
 * Create the standard Northstar JSONL logger for any phase.
 * Later phases (agentic / MCP / A2A) must use this same style:
 * - one new `.jsonl` file per run under `phases/<phase>/logs`
 * - shared event shape via JsonlLogger
 * - phase field set to the canonical phase id
 */
export function createPhaseLogger(options: PhaseLoggerOptions): JsonlLogger {
  const logDir = options.logDir ?? defaultLogDirForPhase(options.phase);
  const logger = new JsonlLogger({
    logDir,
    phase: options.phase,
    component: options.component,
    runId: options.runId,
    fileName: options.fileName,
  });

  if (options.logRunStarted !== false) {
    logger.log("run.started", {
      phase: options.phase,
      component: options.component,
      logFile: path.basename(logger.filePath),
      ...options.runStartedData,
    });
  }

  return logger;
}
