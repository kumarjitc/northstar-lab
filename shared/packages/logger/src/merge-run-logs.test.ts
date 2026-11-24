import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listSiblingRunLogs,
  readMergedRunLogs,
  runLogPrefix,
} from "./merge-run-logs.js";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeJsonl(dir: string, name: string, lines: object[]): void {
  fs.writeFileSync(
    path.join(dir, name),
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
    "utf8",
  );
}

describe("merge-run-logs", () => {
  it("extracts run_ prefix from orchestrator, specialist, and mcp-server names", () => {
    expect(runLogPrefix("run_abc.jsonl")).toBe("run_abc");
    expect(runLogPrefix("run_abc.billing.jsonl")).toBe("run_abc");
    expect(runLogPrefix("run_abc.billing.mcp-server.jsonl")).toBe("run_abc");
    expect(runLogPrefix("run_abc.server.jsonl")).toBe("run_abc");
    expect(runLogPrefix("test-orch.jsonl")).toBeNull();
  });

  it("lists and chronologically merges sibling JSONL files for one run", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "northstar-merge-"));
    temps.push(dir);

    writeJsonl(dir, "run_x.jsonl", [
      { event: "run.started", timestamp: "2026-11-21T02:00:00.000Z", runId: "run_x" },
      { event: "a2a.delegation.started", timestamp: "2026-11-21T02:00:01.000Z", runId: "run_x" },
    ]);
    writeJsonl(dir, "run_x.billing.jsonl", [
      { event: "a2a.delegation.started", timestamp: "2026-11-21T02:00:01.050Z", runId: "run_x" },
      { event: "mcp.tool.completed", timestamp: "2026-11-21T02:00:01.100Z", runId: "run_x" },
    ]);
    writeJsonl(dir, "run_x.billing.mcp-server.jsonl", [
      {
        event: "mcp.server.tool.executed",
        timestamp: "2026-11-21T02:00:01.080Z",
        runId: "run_x",
      },
    ]);
    writeJsonl(dir, "run_other.jsonl", [
      { event: "run.started", timestamp: "2026-11-21T03:00:00.000Z", runId: "run_other" },
    ]);
    // Specialist file named with its own uuid but events share parent runId.
    writeJsonl(dir, "run_orphan-specialist.jsonl", [
      {
        event: "a2a.task.completed",
        timestamp: "2026-11-21T02:00:01.150Z",
        runId: "run_x",
      },
    ]);

    const siblings = listSiblingRunLogs(dir, "run_x.billing.jsonl").map((f) =>
      path.basename(f),
    );
    expect(siblings).toEqual([
      "run_orphan-specialist.jsonl",
      "run_x.billing.jsonl",
      "run_x.billing.mcp-server.jsonl",
      "run_x.jsonl",
    ]);

    const merged = readMergedRunLogs(dir, "run_x.jsonl");
    expect(merged.prefix).toBe("run_x");
    expect(merged.files).toHaveLength(4);
    expect(merged.events.map((e) => e.event)).toEqual([
      "run.started",
      "a2a.delegation.started",
      "a2a.delegation.started",
      "mcp.server.tool.executed",
      "mcp.tool.completed",
      "a2a.task.completed",
    ]);
  });
});
