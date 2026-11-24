import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load .env files into process.env without overriding existing shell vars.
 * Searches phase-local then repo-root .env.
 */
export function loadEnvFiles(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const phaseRoot = path.resolve(here, "..");
  const repoRoot = path.resolve(here, "../../..");
  const candidates = [
    path.join(phaseRoot, ".env"),
    path.join(repoRoot, ".env"),
  ];

  const loaded: string[] = [];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    if (typeof process.loadEnvFile === "function") {
      // Node 20.12+ / 22+: does not override existing env vars.
      process.loadEnvFile(filePath);
      loaded.push(filePath);
      continue;
    }
    // Fallback parser for older Node.
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    loaded.push(filePath);
  }
  return loaded;
}
