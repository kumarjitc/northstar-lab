import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { discoverPhaseLogDirs, isNorthstarPhase } from "./phases.js";

export type LogFileChoice = {
  /** Stable id used by the HTML viewer, e.g. 00-rest/run_x.jsonl */
  id: string;
  path: string;
  name: string;
  phase: string;
  mtimeMs: number;
  sizeBytes: number;
};

export function listJsonlFiles(dir: string, phase = path.basename(path.dirname(dir))): LogFileChoice[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((name) => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      return {
        id: `${phase}/${name}`,
        path: full,
        name,
        phase,
        mtimeMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** List JSONL files across every phases/<phase>/logs directory. */
export function listAllPhaseJsonlFiles(repoRoot = process.cwd()): LogFileChoice[] {
  return discoverPhaseLogDirs(repoRoot)
    .flatMap(({ phase, dir }) => listJsonlFiles(dir, phase))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function formatMtime(mtimeMs: number): string {
  return new Date(mtimeMs).toISOString().replace("T", " ").slice(0, 19);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function chooseFromList(files: LogFileChoice[], title: string): Promise<string> {
  if (files.length === 0) {
    console.error("No .jsonl files found.");
    process.exit(1);
  }

  console.log(title);
  console.log("");
  files.forEach((file, index) => {
    const n = String(index + 1).padStart(2, " ");
    console.log(
      `  ${n}. [${file.phase}] ${file.name}  (${formatMtime(file.mtimeMs)}, ${formatSize(file.sizeBytes)})`,
    );
  });
  console.log("");

  const rl = readline.createInterface({ input, output });
  try {
    const prompt = `Enter number (1-${files.length}), or q to quit: `;
    let answer: string;
    if (input.isTTY) {
      answer = (await rl.question(prompt)).trim();
    } else {
      process.stderr.write(prompt);
      answer = (await rl.question("")).trim();
    }
    if (answer.toLowerCase() === "q" || answer === "") {
      console.error("Cancelled.");
      process.exit(1);
    }
    const chosen = Number(answer);
    if (!Number.isInteger(chosen) || chosen < 1 || chosen > files.length) {
      console.error(`Invalid choice: ${answer}`);
      process.exit(1);
    }
    return files[chosen - 1]!.path;
  } finally {
    rl.close();
  }
}

/**
 * Interactive numbered picker for JSONL log files.
 * Defaults to all phases so later phases appear automatically.
 */
export async function pickJsonlFile(options?: {
  dir?: string;
  phase?: string;
  allPhases?: boolean;
  title?: string;
  repoRoot?: string;
}): Promise<string> {
  const repoRoot = options?.repoRoot ?? process.cwd();

  if (options?.dir) {
    const dir = path.resolve(options.dir);
    const phase =
      options.phase ??
      (path.basename(dir) === "logs" ? path.basename(path.dirname(dir)) : "logs");
    return chooseFromList(
      listJsonlFiles(dir, phase),
      options.title ?? `Choose a JSONL log from ${dir}`,
    );
  }

  if (options?.phase) {
    if (!isNorthstarPhase(options.phase) && !options.phase.match(/^\d{2}-/)) {
      console.error(`Unknown phase: ${options.phase}`);
      process.exit(1);
    }
    const dir = path.resolve(repoRoot, "phases", options.phase, "logs");
    return chooseFromList(
      listJsonlFiles(dir, options.phase),
      options.title ?? `Choose a JSONL log from phase ${options.phase}`,
    );
  }

  const files =
    options?.allPhases === false
      ? listJsonlFiles(path.resolve(repoRoot, "phases/00-rest/logs"), "00-rest")
      : listAllPhaseJsonlFiles(repoRoot);

  return chooseFromList(
    files,
    options?.title ?? "Choose a JSONL log (all phases)",
  );
}

export function resolveLogDirFromArgs(
  args: string[],
  flag: "--pick" | "--latest" | "--dir",
): string {
  const idx = args.indexOf(flag);
  if (idx < 0) return path.resolve("phases/00-rest/logs");
  const maybeDir = args[idx + 1];
  if (maybeDir && !maybeDir.startsWith("--") && !maybeDir.endsWith(".jsonl")) {
    if (isNorthstarPhase(maybeDir) || /^\d{2}-/.test(maybeDir)) {
      return path.resolve("phases", maybeDir, "logs");
    }
    return path.resolve(maybeDir);
  }
  return path.resolve("phases/00-rest/logs");
}

export function resolvePhaseFromArgs(args: string[]): string | undefined {
  const idx = args.indexOf("--phase");
  if (idx < 0) return undefined;
  return args[idx + 1];
}
