// Future LocalRuntimeClient — integration plan and TODO map.
//
// This file documents how to wire the real CreatorMesh runtime behind WorkflowClient.
// It contains no running code — it is a design contract to prevent future rework.
//
// ─── Integration Path ───────────────────────────────────────────────────────
//
//   UI → WorkflowClient (workflowClient.ts)
//      → LocalRuntimeClient (this file, future impl)
//         → LocalWorkflowRunner (src/workflows/local-runner.ts)
//            → Runtime (src/runtime/runtime.ts)
//               → ThoughtAgent (src/agents/thought-agent.ts)
//               → GovernanceEvaluator (src/governance/evaluator.ts)
//               → NotionConnectorAdapter (src/connectors/notion/adapter.ts)
//
// ─── Safety Rule ────────────────────────────────────────────────────────────
//
//   Real connectors must only be enabled through governed runtime mode.
//   The WorkflowClient factory (workflowClient.ts) controls which implementation is active.
//   MockRuntimeClient (mode: mock) must remain the default until LocalRuntimeClient
//   is validated end-to-end with real credentials and governance enforcement.
//
// ─── TODO Map ────────────────────────────────────────────────────────────────
//
// 1. startRun → LocalWorkflowRunner
//    - Map: StartRunRequest.inputText + inputKind → createThought() or createMessage()
//    - Map: StartRunRequest.target → ThoughtToNoteWorkflow input.target
//    - Call: LocalWorkflowRunner.execute(ThoughtToNoteWorkflow, { input, workflowId })
//    - Get: WorkflowRun with status='paused' at HumanReviewStep
//    - Map: WorkflowRun → RuntimeRun (see field mapping below)
//
// 2. getRun → LocalWorkflowRunner.status(runId)
//    - Map: WorkflowRun.status → RuntimeRunStatus
//    - Map: WorkflowRun.stepOutputs → RuntimeStep[]
//    - Map: WorkflowRun.auditLog → RuntimeGovernanceDecision[]
//
// 3. resumeRun → LocalWorkflowRunner.resume(runId, WorkflowResumeInput)
//    - Map: ResumeRunRequest.decision = 'accepted' → WorkflowResumeInput.decision = 'accept'
//    - Map: ResumeRunRequest.decision = 'rejected' → WorkflowResumeInput.decision = 'reject'
//    - Map: ResumeRunRequest.feedback → WorkflowResumeInput.feedback
//    - After resume: ConnectorStep executes NotionConnectorAdapter.execute()
//    - Map: ConnectorResult.data → RuntimeResult.artifactUrl (real Notion page URL)
//    - Map: ConnectorResult.auditId → RuntimeGovernanceDecision
//
// 4. cancelRun → LocalWorkflowRunner.cancel(runId)
//
// 5. getHealth → check LocalWorkflowRunner availability + GovernanceEvaluator config
//    - notionConnected: !!process.env.NOTION_API_KEY
//    - anthropicConnected: !!process.env.ANTHROPIC_API_KEY
//    - externalSideEffectsEnabled: true in local mode
//    - safetyMode: 'local-governed'
//
// ─── Field Mapping: WorkflowRun → RuntimeRun ─────────────────────────────────
//
//   WorkflowRun.id          → RuntimeRun.runId
//   WorkflowRun.status      → RuntimeRun.status
//   WorkflowRun.createdAt   → RuntimeRun.createdAt
//   WorkflowRun.updatedAt   → RuntimeRun.updatedAt
//   WorkflowRun.stepOutputs → RuntimeRun.steps (via step-type mapping)
//   GovernanceEvaluator.evaluate() result → RuntimeGovernanceDecision[]
//   HumanReviewStep.output  → RuntimeRun.review
//   ConnectorResult.data    → RuntimeRun.result
//
// ─── What Must NOT Change in UI ──────────────────────────────────────────────
//
//   The React component tree consumes RuntimeRun. When LocalRuntimeClient maps
//   real WorkflowRun → RuntimeRun correctly, no component should need to change.
//   This is the core value of the WorkflowClient boundary.
//
// ─── When to Implement ───────────────────────────────────────────────────────
//
//   Prerequisite checklist before wiring LocalRuntimeClient:
//   [ ] NOTION_API_KEY credential available and tested
//   [ ] ANTHROPIC_API_KEY credential available and tested
//   [ ] LocalWorkflowRunner.execute() + resume() smoke tests passing
//   [ ] GovernanceEvaluator wired into Runtime (done — see governance/evaluator.ts)
//   [ ] HTTP API server added (e.g. Express or Hono) to serve as runtime bridge
//       OR Tauri backend IPC channel established for desktop-only mode
//   [ ] WorkflowClient factory updated to detect 'local' mode
//
// ─── Recommended Next Integration Step ───────────────────────────────────────
//
//   Option A (web-first):
//   1. Add a minimal Express/Hono server in a new server/ directory
//   2. POST /api/runs → LocalWorkflowRunner.execute()
//   3. POST /api/runs/:id/resume → LocalWorkflowRunner.resume()
//   4. Create HttpRuntimeClient implementing WorkflowClient
//   5. Update createWorkflowClient() factory to return HttpRuntimeClient when mode='local'
//
//   Option B (desktop-first via Tauri):
//   1. Add Tauri commands: start_run, resume_run, get_run, list_runs
//   2. Wire Tauri commands to LocalWorkflowRunner via Rust → Node.js bridge or Rust reimpl
//   3. Create TauriRuntimeClient implementing WorkflowClient
//   4. Update desktopBridge.ts to use TauriRuntimeClient when Tauri is available

export type LocalRuntimeClientPlaceholder = never // no runtime code here
