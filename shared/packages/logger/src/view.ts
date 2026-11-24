#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { formatLogEvent, readJsonl } from "./index.js";
import {
  pickJsonlFile,
  resolveLogDirFromArgs,
  resolvePhaseFromArgs,
} from "./pick-log.js";
import { ensurePhaseLogDirs } from "./phases.js";

function printUsage(): never {
  console.error(`Usage:
  npm run log:view -- [file.jsonl ...] [--pick] [--phase <phase>] [--dir <dir>]

Examples:
  npm run log:view -- --pick
  npm run log:view -- --phase 02-mcp --pick
  npm run log:view -- phases/00-rest/logs/run_....jsonl`);
  process.exit(1);
}

function isFlagValue(args: string[], index: number): boolean {
  const prev = args[index - 1];
  return prev === "--pick" || prev === "--dir" || prev === "--phase";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) printUsage();

  ensurePhaseLogDirs();
  const wantsPick = args.includes("--pick");
  const phase = resolvePhaseFromArgs(args);
  const positionals = args.filter((a, i) => !a.startsWith("--") && !isFlagValue(args, i));

  let files: string[];
  if (positionals.length > 0) {
    files = [];
    for (const p of positionals) {
      const resolved = path.resolve(p);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        files.push(await pickJsonlFile({ dir: resolved }));
      } else {
        files.push(resolved);
      }
    }
  } else if (wantsPick || args.length === 0 || phase || args.includes("--dir")) {
    files = [
      await pickJsonlFile({
        phase,
        dir: args.includes("--dir") ? resolveLogDirFromArgs(args, "--dir") : undefined,
        allPhases: !phase && !args.includes("--dir"),
      }),
    ];
  } else {
    printUsage();
  }

  const events = files.flatMap((file) => {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
    return readJsonl(file);
  });

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const event of events) {
    console.log(formatLogEvent(event));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
