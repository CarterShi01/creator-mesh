# CreatorMesh Console

Isolated PWA-ready web client and Tauri macOS desktop shell for the CreatorMesh Agent OS.
Phase 2 — PWA + Phase 3 — Tauri Desktop Shell + Phase 4 — Governed Runtime Bridge + Phase 5 — Session Bridge / Remote Control MVP.

> **This client must remain side-effect free until connected through a governed API boundary.**

For multi-surface architecture details, see [`docs/session-bridge-architecture.md`](./docs/session-bridge-architecture.md).

---

## Runtime Architecture

The console uses a `WorkflowClient` abstraction that decouples the UI from the runtime implementation.

```
UI components
  → WorkflowClient (src/runtime/workflowClient.ts)
    → MockRuntimeClient   ← current (Phase 4, mock-only, no external calls)
    → LocalRuntimeClient  ← future (LocalWorkflowRunner → Orchestrator → Connectors)
    → HttpRuntimeClient   ← future (server-side API)
```

### Runtime Modes

| Mode | Description | External Side Effects |
|---|---|---|
| `mock` | In-memory mock runtime (current) | None |
| `local` | LocalWorkflowRunner on same machine (future) | Real Notion + Anthropic |
| `remote` | Remote API server (future) | Real Notion + Anthropic |

The current mode is always `mock`. All governance decisions, run events, and human review decisions are recorded in the in-memory `RunLedger`.

---

## Quick Start

```bash
cd clients/creator-console
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## How to Run (Web Dev)

```bash
cd clients/creator-console
npm run dev
# Open http://localhost:5173
```

## How to Build (Web Production)

```bash
cd clients/creator-console
npm run build
# Output: dist/
# Includes: dist/sw.js (service worker), dist/manifest.webmanifest
```

## How to Preview PWA

```bash
cd clients/creator-console
npm run build
npm run preview
# Open http://localhost:4173
# Service worker will register; open DevTools > Application > Service Workers to verify
```

## How to Run Tauri Dev (requires Rust)

**Prerequisites:**
```bash
# Install Rust (one-time)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

```bash
cd clients/creator-console
npm run tauri:dev
# Opens native macOS window pointing at http://localhost:5173
```

## How to Build macOS App (requires Rust)

```bash
cd clients/creator-console
npm run tauri:build
# Output: src-tauri/target/release/bundle/macos/CreatorMesh Console.app
#         src-tauri/target/release/bundle/dmg/CreatorMesh Console_*.dmg
```

### Where Build Artifacts Appear

| Artifact | Path |
|---|---|
| Web build | `dist/` |
| Service worker | `dist/sw.js` |
| macOS .app | `src-tauri/target/release/bundle/macos/CreatorMesh Console.app` |
| macOS .dmg | `src-tauri/target/release/bundle/dmg/CreatorMesh Console_*.dmg` |

---

## What Is Mocked

| Concept | Mock behaviour |
|---|---|
| Thought / Message input | Local textarea, no API call |
| Workflow execution | Deterministic in-memory state machine (`mockWorkflow.ts`) |
| Classification | Hard-coded mock title, category, confidence |
| Human Review | UI-only decision (Accept / Reject / Request Changes) |
| Notion write | Fake URL `notion.so/mock/<runId>`, nothing written |
| Anthropic call | None — zero API calls in this build |
| App version (Tauri) | Returns package version from Cargo.toml |
| Desktop capabilities | All reported as disabled/future — no real native operations |

---

## PWA Notes

- **PWA mode caches only static mock UI assets. No real workflow data is cached yet.**
- Service worker uses Workbox `generateSW` strategy.
- Offline support: the full mock UI works offline after first load.
- Install: in Chrome/Safari, use "Add to Home Screen" or the browser install prompt.
- The PWA status badge in the header shows: Browser / App / Offline ✓ / Update ↻

---

## Platform Boundary

The app detects its runtime environment via `src/platform/platform.ts`:

| Environment | Detection |
|---|---|
| Browser | Default |
| PWA Standalone | `(display-mode: standalone)` media query |
| Tauri Desktop | `window.__TAURI__` present |

Desktop-native commands go through `src/platform/desktopBridge.ts`. All methods are safe, read-only, and fall back gracefully in web/PWA mode.

---

## What Is Intentionally Not Connected

- **Notion API** — `NotionConnectorAdapter` is not called.
- **Anthropic / Claude** — `ClaudeCodeRunnerAdapter` is not called.
- **LocalWorkflowRunner** — the core `src/` runner is not imported.
- **Orchestrator** — state transitions are local mocks only.
- **Governance** — `GovernanceEvaluator` is not referenced.
- **Tauri filesystem plugin** — not enabled; no file reads/writes.
- **Tauri shell plugin** — not enabled; no subprocess execution.
- **Auto-updater** — not implemented.
- **Code signing / notarization** — not implemented.
- **Tray icon** — not implemented.

---

## How UI Maps to Real CreatorMesh Concepts

| UI component | Real CreatorMesh concept |
|---|---|
| Input kind toggle (Thought / Message) | `InputKind` in core domain |
| Workflow Preview steps | `WorkflowDefinition` step list |
| Classify step | `AgentStep` via `ClaudeCodeRunnerAdapter` |
| Structure step | Another `AgentStep` (draft generation) |
| Human Review panel | `HumanReviewStep` — the approval boundary |
| Output step | `ConnectorStep` via `NotionConnectorAdapter` |
| Run Timeline | `Orchestrator` run log |
| Result panel | Artifact written by `NotionConnectorAdapter` |
| Accept / Reject / Request Changes | `HumanReviewStep` decision outcomes |
| Desktop Status panel | Native Tauri command bridge |

---

## Future Integration Points

When connecting to real backend (Phase 4+):

1. **LocalWorkflowRunner** — replace `createMockRun()` with `POST /api/runs`.
2. **Orchestrator** — subscribe to run events via SSE/WebSocket to update step status live.
3. **Governance** — display `GovernanceEvaluator` policy results before the human review boundary.
4. **NotionConnectorAdapter** — replace mock Notion URL with real page link after approval.
5. **ClaudeCodeRunnerAdapter** — replace mock classification with real Claude output.
6. **Tauri local runner** — wire `getLocalRunnerStatus()` to a real local process check.

All integration must go through a governed API boundary — never call adapters directly from the UI.

---

## Session Bridge / Remote Control (Phase 5)

### How to Use Desktop Host Mode

1. Run `npm run dev` and open the browser
2. In the right column, click **▼ Show Session Bridge / Remote Control**
3. In the **Desktop Host** panel, click **Create Host Session**
4. Click **Start Pairing** — a 6-character code appears
5. Leave the pairing code visible

### How to Use Mobile Remote Control Preview

In the same browser window (or a second tab):

1. In the **Remote Control Preview** panel, enter the 6-character pairing code
2. Click **Connect**
3. Click **▶ Start Mock Workflow** — the workflow starts and updates the main panels
4. When the run pauses for human review, click **✓ Accept Review**, **✗ Reject**, or **⟳ Request Changes**
5. The Session Event Log and Connected Surfaces panel update in real time

### What Session Bridge Is (Phase 5)

- In-memory mock transport — all in the same browser process
- No real networking, no WebSocket, no HTTP server
- Demonstrates the multi-surface session model: Host + Controller + Event Log
- All commands go through the shared `WorkflowClient` and `RunLedger`

### What Session Bridge Is Not (Yet)

- Not a real remote control from a second device
- Not a LAN or cloud relay
- Not a real Capacitor mobile app
- Not connected to real workflow execution

See [`docs/session-bridge-architecture.md`](./docs/session-bridge-architecture.md) for the full Phase A → E roadmap.

---

## Roadmap

### Phase 1 — Responsive Web Console (complete)
- Vite + React + TypeScript
- Full mock workflow: Capture → Classify → Structure → Human Review → Output
- 3-column desktop, 2-column tablet, 1-column mobile layout
- No external API calls

### Phase 2 — PWA (complete)
- `manifest.webmanifest` with name, icons, display: standalone
- Service worker via `vite-plugin-pwa` (Workbox generateSW)
- Offline support for mock UI shell
- PWA status badge in header (Browser / App / Offline ✓)
- Platform detection: web | pwa | tauri | unknown

### Phase 3 — Tauri Desktop Shell (scaffolded — awaiting Rust)
- `src-tauri/` with Cargo.toml, main.rs, tauri.conf.json
- Safe read-only native commands: get_app_version, get_platform_label, get_desktop_capabilities
- Desktop bridge in `src/platform/desktopBridge.ts` with graceful web fallback
- Desktop Status panel visible in Tauri mode
- Window: 1280×820, min 900×640, identifier: com.creatormesh.console
- **To activate:** install Rust, then `npm run tauri:build`

### Phase 4 — Governed Runtime Bridge (complete)
- `WorkflowClient` abstraction — decouples UI from runtime
- `MockRuntimeClient` — governed 5-step simulation with 3 governance decisions/run
- `RunLedger` — in-memory audit store for runs, decisions, events
- `GovernancePanel`, `RuntimeHealthPanel`, `RunHistoryPanel`

### Phase 5 — Session Bridge / Remote Control MVP (complete)
- Session domain model: `SessionId`, `SurfaceKind`, `SurfaceRole`, `RemoteControlCommand`
- `SessionStore` — in-memory sessions, surfaces, events, pairing lifecycle
- `MockSessionBridge` — in-process command dispatch; shared `WorkflowClient`
- `DesktopHostPanel` — host mode with pairing code display
- `MobileRemotePanel` — controller mode with remote action buttons
- `SessionEventLog` + `ConnectedSurfacesPanel`
- Architecture doc: `docs/session-bridge-architecture.md` (Phase A → E)

### Phase 6 — LocalRuntimeClient Integration
- Implement `LocalRuntimeClient` (see `src/runtime/localRuntimeClient.placeholder.ts`)
- Add local HTTP server to Tauri backend
- Wire GovernanceEvaluator server-side

### Phase 7 — Mobile Shell (future evaluation)
- Add Capacitor (`npm install @capacitor/core @capacitor/cli && npx cap init`)
- Evaluate LAN pairing bridge (Phase C in `docs/session-bridge-architecture.md`)
- Push notification integration for mobile review prompts

---

## Prerequisites Summary

| Tool | Required for | Status |
|---|---|---|
| Node.js + npm | Web dev and build | Present |
| Rust + Cargo | Tauri desktop build | **Not installed** |
| `rustup` | Install Rust toolchain | Not installed |

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
# Verify:
rustc --version
cargo --version
```

Then build the desktop app:

```bash
cd clients/creator-console
npm run tauri:build
```
