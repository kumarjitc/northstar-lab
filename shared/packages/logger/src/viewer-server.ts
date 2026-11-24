#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { readJsonl } from "./index.js";
import { readMergedRunLogs } from "./merge-run-logs.js";
import { listAllPhaseJsonlFiles, listJsonlFiles } from "./pick-log.js";
import {
  ensurePhaseLogDirs,
  isNorthstarPhase,
} from "./phases.js";
import { buildTraceNodes } from "./trace-graph.js";
import { buildInteractiveViewerHtml } from "./viewer-page.js";

function printUsage(): never {
  console.error(`Usage:
  npm run log:viewer -- [--phase <phase>] [--dir <logsDir>] [--port <port>] [--open]

Examples:
  npm run log:viewer -- --open
  npm run log:viewer -- --phase 01-agentic --open
  npm run log:viewer -- --dir phases/02-mcp/logs --open`);
  process.exit(1);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openPath(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

function parseArgs(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) printUsage();
  let dir: string | undefined;
  let phase: string | undefined;
  let port = Number(process.env.TRACE_VIEWER_PORT ?? 3456);
  let wantsOpen = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir") {
      dir = path.resolve(argv[++i] ?? "");
    } else if (arg === "--phase") {
      phase = argv[++i];
    } else if (arg === "--port") {
      port = Number(argv[++i] ?? port);
    } else if (arg === "--open") {
      wantsOpen = true;
    } else if (arg?.startsWith("--")) {
      console.error(`Unknown flag: ${arg}`);
      printUsage();
    }
  }

  return { dir, phase, port, wantsOpen };
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function sendText(
  res: http.ServerResponse,
  status: number,
  body: string,
  contentType: string,
): void {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

function safeLogId(raw: string): { phase: string; name: string } | null {
  const decoded = decodeURIComponent(raw);
  const parts = decoded.split("/");
  if (parts.length !== 2) return null;
  const [phase, name] = parts;
  if (!phase || !name) return null;
  if (name.includes("..") || name.includes("\\") || !name.endsWith(".jsonl")) return null;
  if (phase.includes("..") || phase.includes("\\") || phase.includes("/")) return null;
  return { phase, name };
}

function resolveLogPath(
  repoRoot: string,
  dir: string | undefined,
  parsed: { phase: string; name: string },
): string | null {
  const filePath = dir
    ? path.join(dir, parsed.name)
    : path.resolve(repoRoot, "phases", parsed.phase, "logs", parsed.name);
  const phasesRoot = path.resolve(repoRoot, "phases");
  if (!filePath.startsWith(phasesRoot) && !(dir && filePath.startsWith(dir))) {
    return null;
  }
  return filePath;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJsonlText(text: string) {
  const events = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return buildTraceNodes(events);
}

async function main(): Promise<void> {
  const { dir, phase, port, wantsOpen } = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  ensurePhaseLogDirs(repoRoot);

  if (phase && !isNorthstarPhase(phase) && !/^\d{2}-/.test(phase)) {
    console.error(`Unknown phase: ${phase}`);
    process.exit(1);
  }

  const html = buildInteractiveViewerHtml({
    title: "Northstar trace viewer",
    defaultLogDir: dir ?? (phase ? `phases/${phase}/logs` : "phases/*/logs"),
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

    void (async () => {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        sendText(res, 200, html, "text/html; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/logs") {
        let files = dir
          ? listJsonlFiles(dir, path.basename(path.dirname(dir)))
          : listAllPhaseJsonlFiles(repoRoot);

        if (phase) {
          files = files.filter((f) => f.phase === phase);
        }

        sendJson(res, 200, {
          mode: dir ? "single-dir" : "all-phases",
          phase: phase ?? null,
          dir: dir ?? path.resolve(repoRoot, "phases"),
          files: files.map((f) => ({
            id: f.id,
            phase: f.phase,
            name: f.name,
            sizeBytes: f.sizeBytes,
            sizeLabel: formatSize(f.sizeBytes),
            mtime: new Date(f.mtimeMs).toISOString().replace("T", " ").slice(0, 19),
          })),
        });
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/logs/")) {
        const raw = url.pathname.slice("/api/logs/".length);
        const parsed = safeLogId(raw);
        if (!parsed) {
          sendJson(res, 400, { error: "Invalid log id. Expected phase/file.jsonl" });
          return;
        }
        const filePath = resolveLogPath(repoRoot, dir, parsed);
        if (!filePath) {
          sendJson(res, 400, { error: "Invalid log path" });
          return;
        }
        if (!fs.existsSync(filePath)) {
          sendJson(res, 404, { error: "Not found" });
          return;
        }
        sendText(res, 200, fs.readFileSync(filePath, "utf8"), "text/plain; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/trace/")) {
        const raw = url.pathname.slice("/api/trace/".length);
        if (raw === "parse") {
          sendJson(res, 405, { error: "Use POST /api/trace/parse" });
          return;
        }
        const parsed = safeLogId(raw);
        if (!parsed) {
          sendJson(res, 400, { error: "Invalid log id. Expected phase/file.jsonl" });
          return;
        }
        const filePath = resolveLogPath(repoRoot, dir, parsed);
        if (!filePath || !fs.existsSync(filePath)) {
          sendJson(res, 404, { error: "Not found" });
          return;
        }
        const merge = url.searchParams.get("merge") !== "0";
        const logDir = path.dirname(filePath);
        if (merge) {
          const merged = readMergedRunLogs(logDir, parsed.name);
          const nodes = buildTraceNodes(merged.events);
          sendJson(res, 200, {
            id: `${parsed.phase}/${parsed.name}`,
            nodes,
            mergedFiles: merged.files,
            runPrefix: merged.prefix,
          });
          return;
        }
        const nodes = buildTraceNodes(readJsonl(filePath));
        sendJson(res, 200, {
          id: `${parsed.phase}/${parsed.name}`,
          nodes,
          mergedFiles: [parsed.name],
          runPrefix: null,
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/trace/parse") {
        try {
          const body = await readBody(req);
          const json = JSON.parse(body) as { text?: string };
          if (typeof json.text !== "string") {
            sendJson(res, 400, { error: "Expected { text: string }" });
            return;
          }
          const nodes = parseJsonlText(json.text);
          sendJson(res, 200, { nodes });
        } catch (error) {
          sendJson(res, 400, {
            error: error instanceof Error ? error.message : "Failed to parse JSONL",
          });
        }
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    })().catch((error: unknown) => {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Internal error",
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const url = `http://127.0.0.1:${port}/`;
  console.log(`Trace viewer: ${url}`);
  console.log(
    phase
      ? `Phase filter: ${phase}`
      : dir
        ? `Log directory: ${dir}`
        : "Scanning all phases: 00-rest, 01-agentic, 02-mcp, 03-a2a, 04-mcp-mixed",
  );
  console.log("Use the Phase + JSONL dropdowns in the page to choose a log.");
  if (wantsOpen) openPath(url);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
