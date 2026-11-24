# Northstar Agent Lab

Independently runnable Node.js / TypeScript reference implementations over the same fictional **Northstar Broadband** dataset. Use this lab to learn how five architectures behave for trusted self-serve — on cost, entitlement, hallucination, and operational risk.

| Phase | Folder | Pattern | What owns the next step |
|---|---|---|---|
| 0 | `phases/00-rest` | Deterministic HTTP APIs | Application code |
| 1 | `phases/01-agentic` | Conversational agent + local tools | Model tool selection |
| 2 | `phases/02-mcp` | Agent + MCP client/server boundary | Model + MCP discovery |
| 3 | `phases/03-a2a` | Orchestrator + specialist agents | A2A delegation; MCP for data |
| 4 | `phases/04-mcp-mixed` | One MCP face; mixed backends | MCP host; billing MCP / service A2A / contract REST |

**Status:** Phases 0–4 are implemented.

---

## Prerequisites

- **Node.js 20+** (see `engines` in `package.json`)
- **npm** (workspaces are used)
- A model API key for live agent phases (1–4), e.g. Mistral — tests run with a mock model and do not need a key

---

## Repository map

```text
agentic-nw/
├── guides/                 # How to build, execute, and regenerate the lab
├── docs/                   # Architecture notes, observations, scenarios, LinkedIn pack
├── phases/                 # Runnable phase packages (00–04)
├── shared/
│   ├── data/               # Fictional JSON fixtures (required at runtime)
│   ├── knowledge/          # Decisioning knowledge markdown (required at runtime)
│   └── packages/           # Shared libraries (logger, data-access, model-client, …)
├── scripts/                # Optional dataset generator
├── COMMANDS.md             # Living command cheat sheet
├── .env.example            # Root reference env vars
└── package.json            # Workspace scripts
```

### Guides (start here for learning)

| Guide | Purpose |
|---|---|
| [guides/northstar_implementation_plan.md](guides/northstar_implementation_plan.md) | Authoritative technical specification |
| [guides/vibe_agent_phase_execution_guide.md](guides/vibe_agent_phase_execution_guide.md) | Phase-by-phase execution prompts and stop gates |
| [guides/data-generation-guide.md](guides/data-generation-guide.md) | Rules for regenerating fictional fixtures |

### Other useful docs

| Doc | Purpose |
|---|---|
| [COMMANDS.md](COMMANDS.md) | Full command cheat sheet |
| [docs/architecture/logging.md](docs/architecture/logging.md) | Shared JSONL logging and trace viewer |
| [docs/northstar_phasewise_customer_utterances.md](docs/northstar_phasewise_customer_utterances.md) | Shared evaluation language |
| [docs/phase0.md](docs/phase0.md) … [docs/phase3.md](docs/phase3.md) | Phase authorisation prompt copies |
| [docs/observations/](docs/observations/) | Lab observations per phase |
| `phases/*/README.md` | Phase-specific detail |

---

## 1. Clone and install

```bash
git clone <your-repo-url> agentic-nw
cd agentic-nw
npm install
```

This installs root dependencies and all workspace packages under `shared/packages/*` and `phases/*`.

---

## 2. Build shared packages and phases

```bash
npm run build
```

This compiles every workspace that defines a `build` script (TypeScript → `dist/` where applicable). Trace viewer scripts under `npm run log:*` expect the logger package to be built.

Optional checks:

```bash
npm run typecheck
npm run test
```

---

## 3. Configure environment

Secrets stay local. Copy examples into real `.env` files (gitignored).

### Root reference

```bash
cp .env.example .env   # optional reference only; phases load their own files
```

### Phase env files (required for live model runs)

```bash
cp phases/01-agentic/.env.example    phases/01-agentic/.env
cp phases/02-mcp/.env.example        phases/02-mcp/.env
cp phases/03-a2a/.env.example        phases/03-a2a/.env
cp phases/04-mcp-mixed/.env.example  phases/04-mcp-mixed/.env
```

Edit each file and set at least:

```bash
MODEL_PROVIDER=mistral
MODEL_API_KEY=your-key-here
# or: MISTRAL_API_KEY=your-key-here
MODEL_BASE_URL=https://api.mistral.ai/v1
MODEL_NAME=mistral-small-latest
```

**Phase 0** needs no model key. It serves fixtures from `shared/data` and `shared/knowledge` by default.

---

## 4. Verify with tests (no API key required)

```bash
npm run rest:test
npm run agentic:test
npm run mcp:test
npm run a2a:test
npm run mixed:test

# or everything that defines tests
npm run test
```

Agentic / MCP / A2A / Mixed unit tests use a **mock model**. You can validate the lab before configuring a real key.

---

## 5. Run each phase

Work through phases in order the first time. Later phases often optionally depend on Phase 0 when using REST-backed modes.

### Phase 0 — REST (deterministic baseline)

```bash
# Terminal A — API on http://127.0.0.1:3000
npm run rest

# Optional — deterministic scenario runners
npm --workspace phases/00-rest run scenarios
```

Smoke checks:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/customers/CUST-1005
curl http://127.0.0.1:3000/customers/CUST-1005/faults
curl "http://127.0.0.1:3000/customers/search?lastName=Patel"
```

### Phase 1 — Agentic

```bash
# Direct tools (no REST server)
npm run agentic

# Or tools via Phase 0 REST — keep `npm run rest` running in another terminal
TOOL_BACKEND=rest npm run agentic

# Optional live eval against the real model
npm run agentic:eval
```

CLI slash commands: `/help` `/new` `/state` `/log` `/quit`

### Phase 2 — MCP

```bash
# Host spawns MCP server over stdio (direct backend)
MCP_TOOL_BACKEND=direct npm run mcp

# REST-backed MCP tools — start Phase 0 first
npm run rest                                          # terminal 1
MCP_TOOL_BACKEND=rest npm run mcp                     # terminal 2

npm run mcp:eval
```

### Phase 3 — A2A

Default specialist ports: billing `4101`, service `4102`, contract `4103`.

```bash
# Specialists use MCP → direct data
A2A_CAPABILITY_BACKEND=mcp-direct npm run a2a

# Specialists use MCP → REST — start Phase 0 first
npm run rest                                          # terminal 1
A2A_CAPABILITY_BACKEND=mcp-rest npm run a2a           # terminal 2

npm run a2a:eval
```

### Phase 4 — Mixed MCP facade

Contract path always uses Phase 0 REST. Default service agent port: `4202`.

```bash
npm run rest                                          # terminal 1 — required for contract
MIXED_BILLING_MCP_BACKEND=direct npm run mixed        # terminal 2

npm run mixed:eval
```

---

## 6. Inspect logs and traces

Every phase writes JSONL under `phases/<phase>/logs/` (gitignored; regenerated on run).

```bash
# HTML viewer (all phases) — in-page file picker
npm run log:viewer -- --open

# Phase-filtered viewers
npm run rest:trace
npm run agentic:trace
npm run mcp:trace
npm run a2a:trace
npm run mixed:trace

# Terminal helpers
npm run log:graph -- --pick
npm run log:view -- --pick
npm run log:graph -- --latest --phase 00-rest
```

Details: [docs/architecture/logging.md](docs/architecture/logging.md).

---

## Suggested learning path

1. Read [guides/northstar_implementation_plan.md](guides/northstar_implementation_plan.md) (architecture intent).
2. Install, build, and run **Phase 0** tests + `npm run rest`.
3. Configure `.env` for Phase 1 and try `TOOL_BACKEND=direct` then `TOOL_BACKEND=rest`.
4. Compare Phase 2 (MCP boundary) and Phase 3 (specialists) on the same customer utterances.
5. Run Phase 4 to see one MCP face over mixed backends.
6. Use the trace viewer after each run; skim [docs/observations/](docs/observations/).

Shared evaluation language: [docs/northstar_phasewise_customer_utterances.md](docs/northstar_phasewise_customer_utterances.md).

If you are driving implementation with a coding agent, follow [guides/vibe_agent_phase_execution_guide.md](guides/vibe_agent_phase_execution_guide.md) **one phase at a time**.

---

## Dataset

Runtime fixtures already live in:

- `shared/data/*.json`
- `shared/knowledge/*.md`

You do **not** need the dataset zip to run the lab. To regenerate fixtures from the generator script, see [guides/data-generation-guide.md](guides/data-generation-guide.md) and `scripts/generate-dataset.mjs`.

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| `MODEL_API_KEY` / auth errors on phases 1–4 | Copy the phase `.env.example` → `.env` and set the key |
| REST-backed modes fail | Is `npm run rest` running? Is `NORTHSTAR_REST_BASE_URL` `http://127.0.0.1:3000`? |
| Missing data / knowledge | Confirm `shared/data` and `shared/knowledge` exist after checkout |
| Trace viewer missing / outdated | Run `npm run build` so `shared/packages/logger/dist` exists |
| Port already in use | Change `REST_PORT` / A2A / mixed service ports in the phase `.env` |
| Tests fail after pull | `rm -rf node_modules && npm install && npm run build && npm run test` |

---

## Command index (short)

| Command | Purpose |
|---|---|
| `npm install` | Install workspaces |
| `npm run build` | Build all packages |
| `npm run test` | Run all workspace tests |
| `npm run rest` | Start Phase 0 API |
| `npm run agentic` | Phase 1 CLI |
| `npm run mcp` | Phase 2 MCP host |
| `npm run a2a` | Phase 3 orchestrator |
| `npm run mixed` | Phase 4 mixed facade |
| `npm run *:test` | Phase tests |
| `npm run *:eval` | Live model scenario eval |
| `npm run *:trace` | Open HTML trace viewer |
| `npm run log:viewer -- --open` | Cross-phase log viewer |

Full detail: **[COMMANDS.md](COMMANDS.md)**.
