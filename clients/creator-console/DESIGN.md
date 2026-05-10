# Design: clients/creator-console

## Current Design Summary

Phase 1 Responsive Web Console MVP. An isolated Vite + React + TypeScript client that demonstrates the full CreatorMesh creator experience using deterministic local mock data. Zero real API calls. Zero imports from core `src/`.

The client is a product demo and integration staging ground — not a prototype to be thrown away. Its mock model mirrors real CreatorMesh concepts 1:1 so that Phase 2 wiring is a substitution, not a rewrite.

## Design Goals

1. Demonstrate the full creator flow: Capture → Classify → Structure → Human Review → Output.
2. Work across desktop (3-column), tablet (2-column), and mobile (1-column) without horizontal scroll.
3. Keep zero coupling to core `src/` until a governed API boundary exists.
4. Make Phase 2 wiring a drop-in substitution — mock functions map directly to real backend calls.
5. Human review must be the visible, enforced approval boundary in the UI.

## Key Decisions

### Isolated package, zero src/ import
**Decision:** `clients/creator-console/` is its own `package.json` with its own TypeScript config. It does not import from `src/`.
**Why:** Prevents accidental coupling before a stable API boundary exists. The client must stay side-effect-free until connected through a governed API. Importing `src/` directly would bypass GovernanceEvaluator.

### Mock-only in Phase 1
**Decision:** All workflow execution is local deterministic mock (`createMockRun`, `acceptRun`, `rejectRun`, `requestChanges`). No HTTP calls.
**Why:** Phase 1 goal is product experience demonstration, not integration. A mock-first approach lets the UI be designed and validated without backend readiness. It also serves as a functional spec for Phase 2.

### Mock model mirrors real concepts 1:1
**Decision:** `MockRun`, `MockWorkflowStep`, `MockClassification`, `MockReview`, `MockResult` each map to a real CreatorMesh concept, documented in `types.ts` comments.
**Why:** When Phase 2 replaces mocks with real API calls, the React component tree does not change — only the data source changes. This keeps Phase 2 scope small.

### 3-column responsive grid
**Decision:** CSS Grid with three named areas: left (Capture), center (WorkflowPreview + HumanReview), right (Timeline + Result). Collapses to 2-column on tablet, 1-column on mobile.
**Why:** Mirrors CreatorMesh's conceptual structure: input → process → output. Desktop users see all three simultaneously. Mobile users scroll through the flow in order.

### Human Review as enforced UI boundary
**Decision:** Accept/Reject/Request Changes buttons are `disabled` when `run.status !== 'paused'`. The UI cannot advance the run until it reaches the HumanReviewStep boundary.
**Why:** Mirrors the real GovernanceEvaluator's enforcement: no external write unless prior HumanReview accepted. The UI should teach this pattern, not work around it.

### Vite + React + TypeScript (no large UI library)
**Decision:** Plain Vite + React + TypeScript with a hand-written CSS design system. No component library.
**Why:** Keeps the bundle small, avoids library lock-in, and keeps the styling legible. A component library can be introduced in Phase 3 if needed for a desktop shell.

## Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Isolated package | No accidental src/ coupling | Extra npm install step |
| Mock-only | Phase 1 ships fast; no backend dependency | No real data; UI cannot be used for real work yet |
| CSS Grid (custom) | Full layout control; no library dep | More CSS to maintain |
| No unit tests in client | Keeps scope minimal | Mock state machine is untested by automated tests |

## Alternatives Considered

- **Next.js** — rejected (SSR adds complexity not needed for Phase 1; violates constraint)
- **Electron/Tauri in Phase 1** — rejected (premature; Phase 1 is web-only)
- **Import from src/ directly** — rejected (bypasses governance; creates coupling before API boundary is defined)
- **Component library (MUI, shadcn)** — deferred to Phase 3; not needed for MVP

## Current Assumptions

- Phase 2 will introduce an HTTP API (or WebSocket/SSE) between this client and `LocalWorkflowRunner` / `Orchestrator`.
- `createMockRun()` will be replaced with `POST /api/runs` — same inputs, same shape returned.
- `acceptRun()` / `rejectRun()` / `requestChanges()` will become `POST /api/runs/:id/review`.
- The React component tree is designed to work with the same `MockRun` shape that a real `WorkflowRun` response would be serialized into.
- Human review enforcement must also exist server-side in `GovernanceEvaluator` — the UI `disabled` is a UX guard, not the security boundary.

## Open Questions

- Should Phase 2 use REST or WebSocket/SSE for live step status updates?
- Should `clients/creator-console/` eventually be served by a Node server in the same repo, or stay as a fully separate static client?
- When real classification (ThoughtAgent output) arrives, should the UI handle partial/missing fields gracefully? (Mock always returns all fields.)
- Should the "Request Changes" flow trigger a re-run with updated input, or just store feedback and require manual re-submit?

## Future Evolution

- **Phase 2 — PWA:** Add `manifest.json` + service worker via `vite-plugin-pwa`. Wire real API calls. Subscribe to Orchestrator events via SSE/WebSocket.
- **Phase 3 — Desktop shell:** Wrap Phase 2 in Tauri or Electron for native tray capture, local file access.
- **Phase 4 — Mobile:** Capacitor or Expo wrapping the same React codebase for iOS/Android push notifications and mobile capture.

## ChatGPT Handoff Context

The Phase 1 Responsive Web Console MVP is at `clients/creator-console/`. It is a fully isolated Vite + React + TypeScript project with no imports from core `src/`. It runs a deterministic local mock state machine (no API calls). The full flow works in the browser: enter a Thought or Message → run workflow → see 5-step pipeline → review classification → Accept/Reject/Request Changes → see result. All buttons enforce the human review boundary. The build passes. The mock model mirrors real CreatorMesh concepts 1:1 (documented in `types.ts` and `integrationNotes.ts`). Phase 2 work is to replace mock functions with real HTTP API calls to `LocalWorkflowRunner` / `Orchestrator` — the component tree does not need to change.
