# Design: clients/creator-console

## Current Design Summary

Phase 4 Governed Runtime Bridge MVP. An isolated Vite + React + TypeScript client (PWA-ready, Tauri shell scaffolded) that uses a `WorkflowClient` abstraction to decouple the UI from the runtime implementation. The current runtime mode is `mock` — all workflow execution, governance decisions, and run history are recorded in an in-memory `RunLedger` with zero external side effects.

The console is now a product demo **and** a staged integration boundary. Switching from mock to local (LocalWorkflowRunner) or remote (HTTP API) requires only replacing the `WorkflowClient` implementation — the component tree and runtime types do not change.

## Design Goals

1. Demonstrate the full creator flow: Capture → Classify → Structure → Human Review → Output.
2. Work across desktop (3-column), tablet (2-column), and mobile (1-column) without horizontal scroll.
3. Keep zero coupling to core `src/` until a governed API boundary exists.
4. Decouple UI from runtime via `WorkflowClient` — switching runtimes is a factory change, not a component change.
5. Human review must be the visible, enforced approval boundary in the UI.
6. Surface governance decisions, runtime health, and run history in the UI.

## Runtime Architecture

```
UI components
  → WorkflowClient (src/runtime/workflowClient.ts)
    → MockRuntimeClient   ← current (mock-only, no external calls)
    → LocalRuntimeClient  ← future (LocalWorkflowRunner → Orchestrator → Connectors)
    → HttpRuntimeClient   ← future (server-side API)
```

All runs, governance decisions, and events are recorded in `RunLedger` (`src/runtime/runLedger.ts`). The `RuntimeHealth` type exposes the current mode and side-effect safety label to the UI.

## Key Decisions

### Isolated package, zero src/ import
**Decision:** `clients/creator-console/` is its own `package.json` with its own TypeScript config. It does not import from `src/`.
**Why:** Prevents accidental coupling before a stable API boundary exists. The client must stay side-effect-free until connected through a governed API. Importing `src/` directly would bypass GovernanceEvaluator.

### WorkflowClient abstraction (Phase 4)
**Decision:** All workflow operations go through a `WorkflowClient` interface (`startRun`, `resumeRun`, `cancelRun`, `getHealth`, `getLedger`). `createWorkflowClient(mode)` returns the correct implementation.
**Why:** Phase 1–3 used direct mock imports in `App.tsx`. This made the runtime boundary invisible and the mock behavior non-auditable. The abstraction makes the swap to a real backend a one-line factory change, not a component refactor.

### RunLedger as in-process audit store
**Decision:** `RunLedger` records every run, step, governance decision, and human decision in memory. UI panels (RunHistoryPanel, GovernancePanel) read from the ledger.
**Why:** Mirrors how the real `GovernanceEvaluator` produces `AuditRecord` per decision. The ledger makes governance and run history visible in the UI before the server-side audit trail is wired. It also serves as a functional spec for the real persistence layer.

### Runtime API types mirror real CreatorMesh concepts 1:1
**Decision:** `RuntimeRun`, `RuntimeStep`, `RuntimeClassification`, `RuntimeGovernanceDecision`, `RuntimeHumanDecision`, `RuntimeResult` each map to a real CreatorMesh concept, documented in `src/runtime/types.ts` comments.
**Why:** When LocalRuntimeClient or HttpRuntimeClient is wired, the React component tree does not change — only the `WorkflowClient` factory argument changes. This keeps integration scope small.

### 3-column responsive grid
**Decision:** CSS Grid with three named areas: left (Capture), center (WorkflowPreview + HumanReview + Governance), right (Timeline + Result + RunHistory + RuntimeHealth). Collapses to 2-column on tablet, 1-column on mobile.
**Why:** Mirrors CreatorMesh's conceptual structure: input → process → output. New panels (Governance, RunHistory, RuntimeHealth) are additive — they fit into existing columns without layout changes.

### Human Review as enforced UI boundary
**Decision:** Accept/Reject/Request Changes buttons are `disabled` when `run.status !== 'paused'`. The UI cannot advance the run until it reaches the HumanReviewStep boundary.
**Why:** Mirrors the real GovernanceEvaluator's enforcement: no external write unless prior HumanReview accepted. The UI should teach this pattern, not work around it.

### Vite + React + TypeScript (no large UI library)
**Decision:** Plain Vite + React + TypeScript with a hand-written CSS design system. No component library.
**Why:** Keeps the bundle small, avoids library lock-in, and keeps the styling legible.

## Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Isolated package | No accidental src/ coupling | Extra npm install step |
| WorkflowClient abstraction | Runtime swap is factory-only; no component change | Added indirection layer |
| RunLedger in-memory | Governance visible in UI; no persistence dep | History lost on page reload until real storage is wired |
| Mock-only runtime | Zero external side effects; safe for demos | No real data; UI cannot be used for real work yet |
| CSS Grid (custom) | Full layout control; no library dep | More CSS to maintain |
| No unit tests in client | Keeps scope minimal | Runtime bridge logic is untested by automated tests |

## Alternatives Considered

- **Next.js** — rejected (SSR adds complexity not needed for this client)
- **Electron/Tauri in Phase 1** — rejected (premature; Phase 1 was web-only)
- **Import from src/ directly** — rejected (bypasses governance; creates coupling before API boundary is defined)
- **Component library (MUI, shadcn)** — deferred; not needed for MVP
- **Keep direct mock imports in App.tsx** — rejected in Phase 4 (non-auditable, invisible runtime boundary, hard to swap)

## Current Assumptions

- Phase 5 integration will replace `MockRuntimeClient` with `LocalRuntimeClient` or `HttpRuntimeClient` — same `WorkflowClient` interface.
- `startRun()` will become `POST /api/runs` — same inputs, same shape returned.
- `resumeRun()` will become `POST /api/runs/:id/review`.
- `RunLedger` events will be replaced by real `AuditRecord` entries from `GovernanceEvaluator`.
- Human review enforcement must also exist server-side in `GovernanceEvaluator` — the UI `disabled` is a UX guard, not the security boundary.
- `LocalRuntimeClient` will use either HTTP (Option A) or Tauri IPC (Option B) — see `src/runtime/localRuntimeClient.placeholder.ts` for both paths.

## Open Questions

- Should real runtime use REST or WebSocket/SSE for live step status updates?
- Should `RunLedger` be backed by IndexedDB (browser-persistent) before a real server is available?
- When real classification (ThoughtAgent output) arrives, should the UI handle partial/missing fields gracefully? (Mock always returns all fields.)
- Should the "Request Changes" flow trigger a re-run with updated input, or just store feedback and require manual re-submit?
- Which integration path (Option A: HTTP, Option B: Tauri IPC) should Phase 5 use for the local runner?

## Future Evolution

- **Phase 5 — Backend Integration:** Replace `MockRuntimeClient` with `LocalRuntimeClient` wired to `LocalWorkflowRunner` via HTTP or Tauri IPC. Subscribe to Orchestrator run events via SSE/WebSocket.
- **Phase 6 — Rust/Tauri Build:** Install Rust, activate `npm run tauri:build`, produce `.app` bundle.
- **Phase 7 — Mobile:** Capacitor or Expo wrapping the same React codebase for iOS/Android push notifications and mobile capture.

## ChatGPT Handoff Context

The console is at `clients/creator-console/` — a fully isolated Vite + React + TypeScript project (Phase 4: PWA-ready + Tauri shell scaffolded + Governed Runtime Bridge). All workflow operations go through a `WorkflowClient` interface (`src/runtime/workflowClient.ts`). Current mode: `mock` — `MockRuntimeClient` runs a 5-step governed workflow simulation; all governance decisions and run events are recorded in `RunLedger`. UI panels: CapturePanel, WorkflowPreview, HumanReviewPanel, GovernancePanel, RuntimeHealthPanel, RunHistoryPanel, RunTimeline, ResultPanel. To switch to a real backend, replace `createWorkflowClient('mock')` with `createWorkflowClient('local')` and implement `src/runtime/localRuntimeClient.ts` using the plan in `localRuntimeClient.placeholder.ts`. No `src/` imports. Build passes.
