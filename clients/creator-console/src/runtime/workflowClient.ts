// WorkflowClient — the stable interface between UI and runtime.
// UI components never import from runtime/mockRuntimeClient.ts directly.
// All workflow actions go through this abstraction.
//
// Dependency direction:
//   UI components → WorkflowClient → runtime implementation (mock | local | remote)

import type {
  RuntimeHealth,
  StartRunRequest,
  StartRunResponse,
  ResumeRunRequest,
  ResumeRunResponse,
  GetRunResponse,
  ListRunsResponse,
} from './types'

// ─── Interface ───────────────────────────────────────────────────────────────

export interface WorkflowClient {
  /** Returns runtime health and safety mode. Maps to: future LocalWorkflowRunner.healthCheck() */
  getHealth(): Promise<RuntimeHealth>

  /**
   * Start a new workflow run.
   * Maps to: future POST /api/runs → LocalWorkflowRunner.execute(ThoughtToNoteWorkflow, input)
   */
  startRun(request: StartRunRequest): Promise<StartRunResponse>

  /**
   * Get the current state of a run.
   * Maps to: future GET /api/runs/:id → Orchestrator.getRunStatus(runId)
   */
  getRun(runId: string): Promise<GetRunResponse>

  /**
   * List all runs in the ledger.
   * Maps to: future GET /api/runs → RunLedger.listRuns()
   */
  listRuns(): Promise<ListRunsResponse>

  /**
   * Resume a paused run with a human review decision.
   * Maps to: future POST /api/runs/:id/resume → LocalWorkflowRunner.resume(runId, ResumeInput)
   *
   * Governance rule: a run may only be resumed after it reaches HumanReviewStep (status=paused).
   */
  resumeRun(runId: string, request: ResumeRunRequest): Promise<ResumeRunResponse>

  /**
   * Cancel a run.
   * Maps to: future POST /api/runs/:id/cancel → LocalWorkflowRunner.cancel(runId)
   */
  cancelRun(runId: string): Promise<GetRunResponse>
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Returns the active WorkflowClient implementation based on runtime mode.
 *
 * Phase 4 (current): always returns MockRuntimeClient.
 * Phase 5 (future): detect local vs remote mode and return the appropriate client.
 */
export async function createWorkflowClient(): Promise<WorkflowClient> {
  // Dynamic import keeps MockRuntimeClient out of the critical bundle path
  // and makes it easy to swap implementations without touching this factory.
  const { MockRuntimeClient } = await import('./mockRuntimeClient')
  return new MockRuntimeClient()
}
