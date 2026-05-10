# CreatorMesh Console

Isolated PWA-ready web client and Tauri macOS desktop shell for the CreatorMesh Agent OS.
Phase 2 — PWA + Phase 3 — Tauri Desktop Shell.

> **This client must remain side-effect free until connected through a governed API boundary.**

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

### Phase 4 — Backend Integration
- Connect LocalWorkflowRunner via governed HTTP API
- Subscribe to Orchestrator run events
- Enable RunLedger storage
- Add controlled local runner management in Desktop shell

### Phase 5 — Mobile (future evaluation)
- Evaluate Capacitor or React Native only after desktop/web workflow stabilizes
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
