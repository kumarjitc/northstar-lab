import fs from "node:fs";
import path from "node:path";
import { readJsonl, type LogEvent } from "./index.js";

/** Extract shared run prefix: run_<id> from orchestrator / specialist / mcp-server files. */
export function runLogPrefix(fileName: string): string | null {
  const base = path.basename(fileName);
  // Everything before the first suffix segment: run_<id>.jsonl | run_<id>.billing.jsonl | …
  const match = base.match(/^(run_[^.]+)/i);
  return match?.[1] ?? null;
}

/** Collect distinct `runId` values from a JSONL file (capped for large logs). */
export function collectRunIds(filePath: string, maxLines = 200): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(filePath)) return ids;
  const text = fs.readFileSync(filePath, "utf8");
  let seen = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    seen += 1;
    if (seen > maxLines) break;
    try {
      const event = JSON.parse(line) as { runId?: unknown };
      if (typeof event.runId === "string" && event.runId.length > 0) {
        ids.add(event.runId);
      }
    } catch {
      // skip malformed lines
    }
  }
  return ids;
}

/** Read the first `runId` field found in a JSONL file. */
export function peekRunId(filePath: string): string | null {
  for (const id of collectRunIds(filePath, 20)) return id;
  return null;
}

function setsIntersect(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) {
    if (b.has(value)) return true;
  }
  return false;
}

/** All JSONL files in `logDir` that belong to the same run as `fileName`. */
export function listSiblingRunLogs(logDir: string, fileName: string): string[] {
  const baseName = path.basename(fileName);
  const primary = path.join(logDir, baseName);
  if (!fs.existsSync(logDir)) return fs.existsSync(primary) ? [primary] : [];

  const prefix = runLogPrefix(baseName);
  const primaryRunIds = collectRunIds(primary);
  if (prefix) primaryRunIds.add(prefix);

  const candidates = fs
    .readdirSync(logDir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => path.join(logDir, name));

  const matched = new Set<string>();
  if (fs.existsSync(primary)) matched.add(primary);

  for (const filePath of candidates) {
    if (matched.has(filePath)) continue;
    const name = path.basename(filePath);
    if (prefix && name.startsWith(prefix)) {
      matched.add(filePath);
      continue;
    }
    const candidateIds = collectRunIds(filePath);
    if (prefix) candidateIds.add(runLogPrefix(name) ?? "");
    candidateIds.delete("");
    if (setsIntersect(primaryRunIds, candidateIds)) {
      matched.add(filePath);
    }
  }

  return [...matched].sort();
}

/** Chronologically merge events from every sibling log for a run. */
export function readMergedRunLogs(
  logDir: string,
  fileName: string,
): {
  events: LogEvent[];
  files: string[];
  prefix: string | null;
} {
  const files = listSiblingRunLogs(logDir, fileName);
  const events = files
    .flatMap((filePath) => readJsonl(filePath))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return {
    events,
    files: files.map((f) => path.basename(f)),
    prefix: runLogPrefix(fileName) ?? peekRunId(path.join(logDir, path.basename(fileName))),
  };
}
