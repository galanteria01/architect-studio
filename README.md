# Architect Studio

A desktop application for **visually designing, simulating, and AI-reviewing system architectures**. Unlike a drawing tool, Architect Studio is *executable*: drag components onto an infinite canvas, connect them, and run a real traffic simulation that computes latency, throughput, availability, cost, and bottlenecks — then have AI generate, review, and optimize the design.

> Built with Tauri 2 (Rust) + React 19 + TypeScript, with a Python (FastAPI) AI sidecar.

---

## Features

- **Visual builder** — infinite React Flow canvas, 35+ components across 8 categories, drag-and-drop, connections, minimap, and a properties panel.
- **Request flow simulator** — deterministic graph engine computes per-node utilization, end-to-end latency (avg/p50/p95/p99), throughput, availability, error rate, and cost. Animated request packets flow along the live path.
- **Live metrics dashboard** — Recharts time-series for latency, throughput, and error rate, plus a cost breakdown by category.
- **Architecture validation** — detects DB-exposed-to-client, circular dependencies, unreachable nodes, single points of failure, missing persistence, dead queues, single-region risk, and overloaded components.
- **Failure injection** — disable any component to simulate an outage and watch metrics + paths recompute.
- **AI Generator / Review / Optimize** — describe a system in natural language to generate an editable architecture; get a scored review; apply one-click optimizations. Works with OpenAI / Anthropic / Gemini, and falls back to a built-in heuristic engine when no key is configured.
- **Interview Mode** — get a system-design prompt, build a solution, and receive a scored evaluation.
- **Learning Mode** — every component carries purpose, use cases, tradeoffs, interview notes, and "used by" companies.
- **Persistence & sharing** — projects and templates saved to SQLite (via Tauri) with a localStorage fallback in the browser; export to JSON/PNG and copy a shareable bundle.

## Monorepo layout

```
sysdesign/
  apps/desktop/            # Tauri + React desktop app
    src/
      components/          # UI (canvas, nodes, edges, sidebar, properties, metrics, ai, ...)
      store/               # Zustand stores (canvas, simulation, project, ui)
      lib/                 # graph + metrics simulation engine, validation, advisor (heuristics)
      services/            # storage (SQLite/localStorage), ai client, export
      data/                # component catalog, templates, regions
      hooks/ types/ pages/
    src-tauri/             # Rust core: SQLite migrations, sidecar lifecycle, capabilities, icons
  services/ai/             # FastAPI AI sidecar + PyInstaller build script
  package.json             # npm workspace root
```

## Tech stack

| Layer        | Choice                                                            |
| ------------ | ---------------------------------------------------------------- |
| Desktop      | Tauri 2 (Rust)                                                   |
| Frontend     | React 19, Vite, TypeScript                                       |
| UI           | shadcn/ui (Base UI), Tailwind CSS v4, Framer Motion, lucide      |
| Diagramming  | @xyflow/react (React Flow)                                       |
| State        | Zustand                                                          |
| Charts       | Recharts                                                         |
| Persistence  | SQLite via `tauri-plugin-sql` (localStorage fallback on web)     |
| AI backend   | FastAPI (Python) sidecar, multi-provider (OpenAI/Anthropic/Gemini) |

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (stable) + the Tauri prerequisites — required to run/build the desktop shell. See https://tauri.app/start/prerequisites/
- **Python** 3.11+ — required only to build/run the AI sidecar (optional; the app falls back to heuristics without it)

## Getting started

Install JS dependencies from the repo root:

```bash
npm install
```

### Run the web UI only (fastest)

```bash
npm run dev
```

Open http://localhost:1420. In the browser, data persists to localStorage and AI features use the heuristic engine.

### Run the full desktop app

```bash
# 1. (optional but recommended) build the AI sidecar binary first
npm run ai:build          # PyInstaller -> apps/desktop/src-tauri/binaries/ai-server-<target-triple>

# 2. launch the Tauri dev app (spawns the sidecar, uses SQLite)
npm run tauri:dev
```

> The desktop build registers the sidecar via Tauri `externalBin`, so the binary must exist before `tauri dev`/`tauri build`. If you don't need AI-from-the-sidecar, you can run the Python server manually (`npm run ai:dev`) and remove the `externalBin` entry from `apps/desktop/src-tauri/tauri.conf.json`.

### AI sidecar (Python)

```bash
cd services/ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py            # serves http://localhost:8008
```

Configure a provider by exporting any of these before launching:

```bash
export OPENAI_API_KEY=...      # or ANTHROPIC_API_KEY / GEMINI_API_KEY
export AI_PROVIDER=anthropic   # optional override
export AI_MODEL=...            # optional model override
```

Without a key, the sidecar serves deterministic heuristic responses, so every AI feature still works.

## Scripts (root)

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Vite dev server (web UI)                     |
| `npm run build`     | Type-check + build the frontend              |
| `npm run tauri:dev` | Run the Tauri desktop app in dev             |
| `npm run tauri:build` | Build a distributable desktop bundle       |
| `npm run ai:dev`    | Run the FastAPI sidecar with autoreload      |
| `npm run ai:build`  | Build the sidecar binary via PyInstaller     |

## Simulation model (summary)

- Offered load is split across client entry points and propagated forward through a DAG (cycle back-edges are excluded from flow but reported as validation issues).
- Per-node utilization = inbound rps / (capacity × replicas); latency inflates as utilization passes 70% and requests drop past 100%.
- Availability combines single-points-of-failure in series with parallel-path redundancy; replicas raise per-node availability as `1 - (1 - a)^replicas`.
- Throughput is the offered load at which the first node saturates; cost sums replica-weighted monthly costs.

## License

Internal project scaffold.
