// Runtime API contract for the CreatorMesh Console.
// These types form the stable boundary between UI and runtime implementation.
// The runtime may be: mock (current) | local (LocalWorkflowRunner) | remote (future API server).

// ─── Runtime Mode ───────────────────────────────────────────────────────────

/** Maps to: future RuntimeConfig.mode — controls which WorkflowClient implementation is active */
export type RuntimeMode = 'mock' | 'local' | 'remote'

// ─── Health ─────────────────────────────────────────────────────────────────

/** Maps to: future LocalWorkflowRunner.healthCheck() + GovernanceConfig */
export interface RuntimeHealth {
  mode: RuntimeMode
  /** True only when real Notion, Anthropic, or filesystem side effects are enabled */
  externalSideEffectsEnabled: boolean
  /** False until NotionConnectorAdapter is wired through governed API boundary */
  notionConnected: boolean
  /** False until ClaudeCodeRunnerAdapter / ThoughtAgent is wired */
  anthropicConnected: boolean
  /** True when running inside Tauri desktop shell */
  desktopShellAvailable: boolean
  /** Human-readable safety label shown in UI */
  safetyMode: 'mock-only' | 'local-governed' | 'fully-live'
}

// ─── Run Lifecycle ───────────────────────────────────────────────────────────

/** Maps to: Orchestrator WorkflowRun lifecycle states */
export type RuntimeRunStatus =
  | 'running'
  | 'paused'             // at HumanReviewStep boundary
  | 'completed'
  | 'rejected'
  | 'changes_requested'
  | 'cancelled'

/** Maps to: WorkflowStepType + StepStatus */
export type RuntimeStepType = 'capture' | 'classify' | 'structure' | 'human_review' | 'output'

export type RuntimeStepStatus = 'pending' | 'running' | 'completed' | 'paused' | 'rejected' | 'skipped'

/** Maps to: a single WorkflowStep execution record in Orchestrator run log */
export interface RuntimeStep {
  id: string
  label: string
  type: RuntimeStepType
  status: RuntimeStepStatus
  description: string
  completedAt?: string
}

// ─── Classification ──────────────────────────────────────────────────────────

/** Maps to: ThoughtAgent classification output (AgentStep result) */
export interface RuntimeClassification {
  suggestedTitle: string
  category: string
  summary: string
  /** 0–1 confidence from agent. Mock: always 0.91 */
  confidence: number
  proposedOutput: string
}

// ─── Review ──────────────────────────────────────────────────────────────────

export type HumanDecisionKind = 'pending' | 'accepted' | 'rejected' | 'changes_requested'

/** Maps to: HumanReviewStep decision outcome written to WorkflowRun.stepOutputs */
export interface RuntimeHumanDecision {
  decision: HumanDecisionKind
  feedback?: string
  reviewedAt?: string
}

// ─── Governance ──────────────────────────────────────────────────────────────

export type GovernanceOutcome = 'approved' | 'needs_review' | 'denied' | 'auto_approved'

/** Maps to: GovernanceEvaluator.evaluate() result written to AuditRecord */
export interface RuntimeGovernanceDecision {
  id: string
  stepId: string
  stepLabel: string
  outcome: GovernanceOutcome
  reason: string
  /** Which permission level triggered this check */
  permissionLevel: 'safe_read' | 'write' | 'destructive' | 'external_side_effect'
  decidedAt: string
}

// ─── Result ──────────────────────────────────────────────────────────────────

/** Maps to: ConnectorResult artifact from NotionConnectorAdapter (mock Notion URL in Phase 4) */
export interface RuntimeResult {
  title: string
  /** Mock: fake notion.so URL. Real: actual Notion page URL after connector write */
  artifactUrl: string
  artifactSummary: string
  nextSuggestedAction: string
  isMock: boolean
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type RuntimeEventKind =
  | 'run.created'
  | 'step.completed'
  | 'run.paused'
  | 'human.accepted'
  | 'human.rejected'
  | 'human.changes_requested'
  | 'run.completed'
  | 'run.cancelled'

export interface RuntimeEvent {
  id: string
  runId: string
  kind: RuntimeEventKind
  timestamp: string
  detail?: string
}

// ─── Run ─────────────────────────────────────────────────────────────────────

/** Maps to: Orchestrator WorkflowRun — the full in-memory run record */
export interface RuntimeRun {
  runId: string
  /** Maps to: InputKind in core domain */
  inputKind: 'thought' | 'message'
  inputText: string
  /** Target workspace / Notion database name (mock in Phase 4) */
  target: string
  status: RuntimeRunStatus
  steps: RuntimeStep[]
  classification: RuntimeClassification
  review: RuntimeHumanDecision
  governanceDecisions: RuntimeGovernanceDecision[]
  events: RuntimeEvent[]
  result?: RuntimeResult
  createdAt: string
  updatedAt: string
}

// ─── Request / Response ──────────────────────────────────────────────────────

/** Maps to: POST /api/runs body — future real API call */
export interface StartRunRequest {
  inputKind: 'thought' | 'message'
  inputText: string
  target: string
}

export interface StartRunResponse {
  run: RuntimeRun
  error?: RuntimeError
}

/** Maps to: POST /api/runs/:id/resume — future real API call */
export interface ResumeRunRequest {
  decision: HumanDecisionKind
  feedback?: string
}

export interface ResumeRunResponse {
  run: RuntimeRun
  error?: RuntimeError
}

export interface GetRunResponse {
  run: RuntimeRun | null
  error?: RuntimeError
}

export interface ListRunsResponse {
  runs: RuntimeRun[]
  error?: RuntimeError
}

// ─── Error ───────────────────────────────────────────────────────────────────

/** Structured error — client never throws, always returns error field */
export interface RuntimeError {
  code: string
  message: string
}
