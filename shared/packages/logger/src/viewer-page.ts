/** Interactive HTML viewer. Trace meaning is built server-side via /api/trace*. */
export function buildInteractiveViewerHtml(options?: {
  title?: string;
  defaultLogDir?: string;
}): string {
  const title = options?.title ?? "Northstar trace viewer";
  const defaultLogDir = options?.defaultLogDir ?? "phases/*/logs";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f7f5f1; --ink: #1c1917; --muted: #78716c; --line: #d6d3d1; --card: #fff;
      --http: #0f766e; --scenario: #1d4ed8; --decision: #b45309; --run: #57534e;
      --error: #b91c1c; --model: #7c3aed; --tool: #0369a1; --mcp: #be185d; --a2a: #c2410c;
      --user: #0f766e; --assistant: #1d4ed8; --accent: #0f766e;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font: 15px/1.45 "IBM Plex Sans", "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
    header { position: sticky; top: 0; z-index: 2; padding: 1rem 1.5rem; border-bottom: 1px solid var(--line); background: #fff; }
    h1 { margin: 0 0 0.25rem; font-size: 1.2rem; font-weight: 600; }
    .subtitle { margin: 0 0 0.75rem; color: var(--muted); font-size: 0.85rem; }
    .picker { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: end; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 12rem; flex: 1 1 14rem; }
    label { font-size: 0.8rem; color: var(--muted); }
    select, input[type="file"], button { font: inherit; color: var(--ink); border: 1px solid var(--line); border-radius: 0.4rem; background: #fff; padding: 0.45rem 0.6rem; }
    button { cursor: pointer; background: var(--accent); color: #fff; border-color: var(--accent); white-space: nowrap; }
    button.secondary { background: #fff; color: var(--ink); border-color: var(--line); }
    .status { margin-top: 0.6rem; color: var(--muted); font-size: 0.85rem; }
    .status.error { color: var(--error); }
    .story { margin: 1rem 1.5rem 0; max-width: 52rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid var(--line); border-radius: 0.5rem; }
    .story h2 { margin: 0 0 0.4rem; font-size: 1rem; font-weight: 600; }
    .story ol { margin: 0; padding-left: 1.2rem; color: var(--muted); }
    ol.timeline { list-style: none; margin: 0; padding: 1.25rem 1.5rem 2rem; max-width: 52rem; }
    .node { display: grid; grid-template-columns: 1.25rem 1fr; gap: 0.75rem; position: relative; padding-bottom: 0.85rem; }
    .node:not(:last-child)::before { content: ""; position: absolute; left: 0.5rem; top: 1.1rem; bottom: 0; width: 2px; background: var(--line); }
    .rail { width: 0.85rem; height: 0.85rem; margin-top: 0.55rem; border-radius: 999px; border: 2px solid #44403c; background: #fff; z-index: 1; }
    .kind-http .rail { border-color: var(--http); }
    .kind-scenario .rail, .kind-assistant .rail { border-color: var(--scenario); }
    .kind-decision .rail { border-color: var(--decision); }
    .kind-run .rail { border-color: var(--run); }
    .kind-model .rail { border-color: var(--model); }
    .kind-tool .rail { border-color: var(--tool); }
    .kind-user .rail { border-color: var(--user); }
    .kind-mcp .rail { border-color: var(--mcp); }
    .kind-a2a .rail { border-color: var(--a2a); }
    .kind-error .rail { border-color: var(--error); background: #fee2e2; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 0.5rem; padding: 0.65rem 0.8rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.5rem; color: var(--muted); font-size: 0.8rem; margin-bottom: 0.2rem; }
    .kind { text-transform: uppercase; letter-spacing: 0.04em; }
    .kind-http .kind, .kind-user .kind { color: var(--http); }
    .kind-scenario .kind, .kind-assistant .kind { color: var(--scenario); }
    .kind-decision .kind { color: var(--decision); }
    .kind-run .kind { color: var(--run); }
    .kind-model .kind { color: var(--model); }
    .kind-tool .kind { color: var(--tool); }
    .kind-mcp .kind { color: var(--mcp); }
    .kind-a2a .kind { color: var(--a2a); }
    .kind-error .kind { color: var(--error); }
    .label { font-weight: 500; }
    .explanation { margin-top: 0.3rem; color: #44403c; font-size: 0.92rem; }
    .detail { margin-top: 0.35rem; color: var(--muted); font-size: 0.88rem; white-space: pre-wrap; }
    .empty { padding: 2rem 1.5rem; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">Plain-language steps for REST / Agentic / MCP / A2A · ${escapeHtml(defaultLogDir)}</p>
    <div class="picker">
      <div class="field">
        <label for="phaseSelect">Phase</label>
        <select id="phaseSelect" aria-label="Filter by phase">
          <option value="">All phases</option>
        </select>
      </div>
      <div class="field" style="flex: 2 1 20rem;">
        <label for="logSelect">JSONL log file</label>
        <select id="logSelect" aria-label="Choose JSONL log file">
          <option value="">Loading log list…</option>
        </select>
      </div>
      <div class="field">
        <label for="fileInput">Or open a local file</label>
        <input id="fileInput" type="file" accept=".jsonl,application/x-ndjson,text/plain" />
      </div>
      <button id="refreshBtn" type="button" class="secondary">Refresh list</button>
    </div>
    <div id="status" class="status">Loading logs…</div>
  </header>
  <section id="story" class="story" hidden></section>
  <main id="main"><p class="empty">Choose a JSONL file to render its linear execution graph.</p></main>
  <script>
    const statusEl = document.getElementById("status");
    const phaseSelect = document.getElementById("phaseSelect");
    const selectEl = document.getElementById("logSelect");
    const fileInput = document.getElementById("fileInput");
    const refreshBtn = document.getElementById("refreshBtn");
    const mainEl = document.getElementById("main");
    const storyEl = document.getElementById("story");
    let allFiles = [];

    function setStatus(message, isError) {
      statusEl.textContent = message;
      statusEl.classList.toggle("error", Boolean(isError));
    }
    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }
    function shortTime(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toISOString().slice(11, 23);
    }

    function buildStory(nodes) {
      const interesting = nodes.filter((n) =>
        ["user", "model", "tool", "assistant", "decision", "scenario", "http", "mcp", "a2a", "error"].includes(n.kind),
      );
      if (!interesting.length) {
        storyEl.hidden = true;
        storyEl.innerHTML = "";
        return;
      }
      const items = interesting
        .slice(0, 12)
        .map((n) => "<li><strong>" + escapeHtml(n.label) + "</strong>" +
          (n.explanation ? " — " + escapeHtml(n.explanation) : "") + "</li>")
        .join("");
      storyEl.hidden = false;
      storyEl.innerHTML = "<h2>What happened (story)</h2><ol>" + items + "</ol>";
    }

    function renderNodes(nodes, sourceLabel) {
      if (!nodes.length) {
        mainEl.innerHTML = '<p class="empty">No meaningful steps in this file.</p>';
        storyEl.hidden = true;
        setStatus("Loaded " + sourceLabel + " · 0 steps");
        return;
      }
      buildStory(nodes);
      const items = nodes.map((node) => {
        const dur = node.durationMs !== undefined
          ? '<span class="dur">' + escapeHtml(String(node.durationMs)) + "ms</span>" : "";
        const explanation = node.explanation
          ? '<div class="explanation">' + escapeHtml(node.explanation) + "</div>" : "";
        const detail = node.detail
          ? '<div class="detail">' + escapeHtml(node.detail) + "</div>" : "";
        return (
          '<li class="node kind-' + escapeHtml(node.kind) + '">' +
          '<div class="rail" aria-hidden="true"></div>' +
          '<div class="card">' +
          '<div class="meta"><time>' + escapeHtml(shortTime(node.timestamp)) + "</time>" + dur +
          '<span class="kind">' + escapeHtml(node.kind) + "</span></div>" +
          '<div class="label">' + escapeHtml(node.label) + "</div>" +
          explanation + detail +
          "</div></li>"
        );
      }).join("");
      mainEl.innerHTML = '<ol class="timeline">' + items + "</ol>";
      setStatus("Loaded " + sourceLabel + " · " + nodes.length + " clear steps");
    }

    function populatePhaseFilter(files) {
      const phases = [...new Set(files.map((f) => f.phase).filter(Boolean))].sort();
      const current = phaseSelect.value;
      phaseSelect.innerHTML = '<option value="">All phases</option>';
      for (const phase of phases) {
        const opt = document.createElement("option");
        opt.value = phase;
        opt.textContent = phase;
        phaseSelect.appendChild(opt);
      }
      if (phases.includes(current)) phaseSelect.value = current;
    }

    function populateLogSelect() {
      const phase = phaseSelect.value;
      const files = phase ? allFiles.filter((f) => f.phase === phase) : allFiles;
      selectEl.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = files.length ? "Select a JSONL file…" : "No JSONL files found";
      selectEl.appendChild(placeholder);
      for (const file of files) {
        const opt = document.createElement("option");
        opt.value = file.id;
        opt.textContent = "[" + file.phase + "] " + file.name + "  (" + (file.mtime || "") + ", " + (file.sizeLabel || "") + ")";
        selectEl.appendChild(opt);
      }
      return files;
    }

    async function loadLogList() {
      selectEl.innerHTML = '<option value="">Loading…</option>';
      try {
        const res = await fetch("/api/logs");
        if (!res.ok) throw new Error("Could not list logs (" + res.status + ")");
        const payload = await res.json();
        allFiles = payload.files || [];
        populatePhaseFilter(allFiles);
        const files = populateLogSelect();
        setStatus(files.length
          ? "Choose a log · " + allFiles.length + " file(s) across phases"
          : "No .jsonl files yet");
        if (files[0]) {
          selectEl.value = files[0].id;
          await loadSelectedLog();
        }
      } catch (err) {
        selectEl.innerHTML = '<option value="">Server list unavailable</option>';
        setStatus("Log list unavailable. Use local file. " + String(err && err.message ? err.message : err), true);
      }
    }

    async function loadSelectedLog() {
      const id = selectEl.value;
      if (!id) return;
      setStatus("Loading " + id + "…");
      const res = await fetch("/api/trace/" + encodeURIComponent(id));
      if (!res.ok) {
        setStatus("Failed to load " + id + " (" + res.status + ")", true);
        return;
      }
      const payload = await res.json();
      const merged = Array.isArray(payload.mergedFiles) ? payload.mergedFiles : [];
      const sourceLabel = merged.length > 1
        ? id + " (+" + (merged.length - 1) + " sibling log" + (merged.length === 2 ? "" : "s") + ")"
        : id;
      renderNodes(payload.nodes || [], sourceLabel);
    }

    phaseSelect.addEventListener("change", () => {
      const files = populateLogSelect();
      if (files[0]) {
        selectEl.value = files[0].id;
        loadSelectedLog().catch((err) => setStatus(String(err), true));
      } else {
        mainEl.innerHTML = '<p class="empty">No logs for this phase yet.</p>';
        storyEl.hidden = true;
        setStatus("No logs for phase filter");
      }
    });
    selectEl.addEventListener("change", () => {
      loadSelectedLog().catch((err) => setStatus(String(err), true));
    });
    refreshBtn.addEventListener("click", () => {
      loadLogList().catch((err) => setStatus(String(err), true));
    });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      setStatus("Parsing " + file.name + "…");
      const text = await file.text();
      const res = await fetch("/api/trace/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setStatus("Failed to parse local file (" + res.status + ")", true);
        return;
      }
      const payload = await res.json();
      renderNodes(payload.nodes || [], file.name);
    });

    loadLogList().catch((err) => setStatus(String(err), true));
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
