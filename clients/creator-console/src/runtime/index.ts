// Runtime module — public API
// Import from here for runtime types, client interface, and factory.

// Types
export type {
  RuntimeMode,
  RuntimeHealth,
  RuntimeRunStatus,
  RuntimeStepType,
  RuntimeStepStatus,
  RuntimeStep,
  RuntimeClassification,
  HumanDecisionKind,
  RuntimeHumanDecision,
  GovernanceOutcome,
  RuntimeGovernanceDecision,
  RuntimeResult,
  RuntimeEventKind,
  RuntimeEvent,
  RuntimeRun,
  StartRunRequest,
  StartRunResponse,
  ResumeRunRequest,
  ResumeRunResponse,
  GetRunResponse,
  ListRunsResponse,
} from './types'

// RuntimeClient interface (prefer RuntimeClient over WorkflowClient in new code)
export type { RuntimeClient, WorkflowClient } from './client'

// Factory
export { getRuntimeClient, createWorkflowClient, getRuntimeClientSync, resetRuntimeClient } from './workflowClient'

// Mock implementation (for testing / direct reference)
export { MockRuntimeClient } from './mock/mockClient'
export { RunLedger } from './mock/runLedger'
