#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  listAllPhaseJsonlFiles,
  listJsonlFiles,
  pickJsonlFile,
  resolveLogDirFromArgs,
  resolvePhaseFromArgs,
} from "./pick-log.js";
import { readMergedRunLogs } from "./merge-run-logs.js";
import { ensurePhaseLogDirs } from "./phases.js";
import { buildTraceNodes, formatTraceAscii, formatTraceHtml } from "./trace-graph.js";

function printUsage(): never {
  console.error(`Usage:
  npm run log:graph -- [file.jsonl] [--html] [--open] [--pick] [--phase <phase>] [--latest] [--dir <dir>]

Examples:
  npm run log:graph -- --pick
  npm run log:graph -- --phase 01-agentic --pick
  npm run log:graph -- --latest --phase 00-rest
  npm run log:graph -- phases/00-rest/logs/run_....jsonl`);
  process.exit(1);
}

function resolveLatest(phase?: string, dir?: string): string {
  const files = dir
    ? listJsonlFiles(dir)
    : phase
      ? listJsonlFiles(path.resolve("phases", phase, "logs"), phase)
      : listAllPhaseJsonlFiles();
  if (files.length === 0) {
    console.error("No .jsonl files found.");
    process.exit(1);
  }
  return files[0]!.path;
}

function openPath(filePath: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", filePath] : [filePath];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

function isFlagValue(args: string[], index: number): boolean {
  const prev = args[index - 1];
  return prev === "--pick" || prev === "--latest" || prev === "--dir" || prev === "--phase";
}

async function resolveFile(args: string[]): Promise<string> {
  const wantsPick = args.includes("--pick");
  const wantsLatest = args.includes("--latest");
  const phase = resolvePhaseFromArgs(args);
  const positionals = args.filter((a, i) => !a.startsWith("--") && !isFlagValue(args, i));

  const first = positionals[0];
  if (first) {
    const resolved = path.resolve(first);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return pickJsonlFile({ dir: resolved });
    }
    return resolved;
  }

  if (wantsLatest) {
    const dir = args.includes("--dir") ? resolveLogDirFromArgs(args, "--dir") : undefined;
    return resolveLatest(phase, dir);
  }

  return pickJsonlFile({
    phase,
    dir: args.includes("--dir") ? resolveLogDirFromArgs(args, "--dir") : undefined,
    allPhases: !phase && !args.includes("--dir"),
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) printUsage();

  ensurePhaseLogDirs();
  const wantsHtml = args.includes("--html");
  const wantsOpen = args.includes("--open");
  const file = await resolveFile(args);

  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const merged = readMergedRunLogs(path.dirname(file), path.basename(file));
  const nodes = buildTraceNodes(merged.events);
  const mergeNote =
    merged.files.length > 1 ? ` · merged ${merged.files.length} files` : "";
  const title = `Trace · ${path.basename(file)}${mergeNote} · ${nodes.length} steps`;

  if (wantsHtml || wantsOpen) {
    const htmlPath = file.replace(/\.jsonl$/i, ".trace.html");
    fs.writeFileSync(htmlPath, formatTraceHtml(nodes, { title, source: file }), "utf8");
    console.log(formatTraceAscii(nodes, title));
    console.log(`\nHTML snapshot: ${htmlPath}`);
    console.log("For the in-page picker across phases: npm run log:viewer -- --open");
    if (wantsOpen) openPath(htmlPath);
  } else {
    console.log(formatTraceAscii(nodes, title));
    console.log(`\nTip: npm run log:viewer -- --open`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
