// Mock domain model mirroring CreatorMesh concepts.
// Does NOT import from core src/ modules.

/** Maps to: Thought or Message input kind in CreatorMesh */
export type InputKind = 'thought' | 'message'

/** Maps to: Orchestrator run lifecycle states */
export type RunStatus =
  | 'idle'
  | 'running'
  | 'paused'       // at HumanReviewStep boundary
  | 'completed'
  | 'rejected'
  | 'changes_requested'

/** Maps to: AgentStep / ConnectorStep / RunnerStep / HumanReviewStep status */
export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'paused'
  | 'rejected'
  | 'skipped'

/** Maps to: ConnectorStep or RunnerStep in a WorkflowDefinition */
export interface MockWorkflowStep {
  id: string
  /** Step label shown in UI */
  label: string
  /** step type mirrors real step types */
  type: 'capture' | 'classify' | 'structure' | 'human_review' | 'output'
  status: StepStatus
  description: string
}

/** Maps to: classification output from an AgentStep (e.g. ClaudeCodeRunnerAdapter) */
export interface MockClassification {
  suggestedTitle: string
  category: string
  summary: string
  confidence: number  // 0-1
  proposedOutput: string
}

/** Maps to: HumanReviewStep review record */
export interface MockReview {
  decision: 'accepted' | 'rejected' | 'changes_requested' | 'pending'
  feedback?: string
  reviewedAt?: string
}

/** Maps to: final artifact written by NotionConnectorAdapter */
export interface MockResult {
  title: string
  mockNotionUrl: string
  artifactSummary: string
  nextSuggestedAction: string
}

/** Maps to: a full Orchestrator run instance */
export interface MockRun {
  runId: string
  inputKind: InputKind
  inputText: string
  target: string
  status: RunStatus
  steps: MockWorkflowStep[]
  classification: MockClassification
  review: MockReview
  result?: MockResult
  createdAt: string
}
