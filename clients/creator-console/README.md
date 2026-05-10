# CreatorMesh Console

Isolated responsive web client for the CreatorMesh Agent OS.
Phase 1 — Responsive Web Console MVP.

> **This client must remain side-effect free until connected through a governed API boundary.**

---

## How to Run

```bash
cd clients/creator-console
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## How to Build

```bash
npm run build      # TypeScript check + Vite production build
npm run typecheck  # TypeScript only
npm run preview    # Preview production build locally
```

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

---

## What Is Intentionally Not Connected

- **Notion API** — `NotionConnectorAdapter` is not called.
- **Anthropic / Claude** — `ClaudeCodeRunnerAdapter` is not called.
- **LocalWorkflowRunner** — the core `src/` runner is not imported.
- **Orchestrator** — state transitions are local mocks only.
- **Governance** — `GovernanceEvaluator` is not referenced.
- **Service workers / PWA manifest** — not implemented in Phase 1.

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

---

## Future Integration Points

When connecting to real backend (Phase 2+):

1. **LocalWorkflowRunner** — replace `createMockRun()` with a call to `LocalWorkflowRunner.run(input)`.
2. **Orchestrator** — subscribe to Orchestrator run events to update step statuses in real time.
3. **Governance** — display `GovernanceEvaluator` policy results before the human review boundary.
4. **NotionConnectorAdapter** — replace mock Notion URL with real page link after approval.
5. **ClaudeCodeRunnerAdapter** — replace mock classification with real Claude output.

All integration must go through a governed API boundary — never call adapters directly from the UI.

---

## Roadmap

### Phase 1 — Responsive Web Console (current)
- Vite + React + TypeScript
- Full mock workflow: Capture → Classify → Structure → Human Review → Output
- 3-column desktop, 2-column tablet, 1-column mobile layout
- No external API calls

### Phase 2 — PWA
- Add `manifest.json` and service worker
- Offline support for mock mode
- Push notifications for human review prompts
- Optionally connect to a local CreatorMesh API server

### Phase 3 — Tauri / Electron Shell
- Wrap Phase 2 in a desktop shell
- Access local filesystem for draft storage
- Native tray integration for quick capture

### Phase 4 — Capacitor / React Native / Expo
- Mobile app wrapping the same React codebase
- Share mock model and state machine with web
- Push notification integration for mobile review prompts
