// RuntimeClient — the pure interface contract between UI and workflow execution.
//
// This file contains ONLY the interface. No implementation. No factory.
// Import this when you need the type; import workflowClient.ts for the factory.
//
// Architecture:
//   UI → RuntimeClient interface → implementation (mock | local | remote)
//
// Implementations:
//   mock    → runtime/mock/mockClient.ts     (current — in-memory, no side effects)
//   local   → runtime/localClient.ts         (Phase B — LocalWorkflowRunner via Tauri IPC)
//   remote  → runtime/remoteClient.ts        (Phase C — HTTP API server)
//
// Governance invariant:
//   All write/execute/external-side-effect actions require prior HumanReview acceptance.
//   The RuntimeClient enforces this server-side; the UI enforces it as a UX guard only.

import type {
  RuntimeHealth,
  StartRunRequest,
  StartRunResponse,
  ResumeRunRequest,
  ResumeRunResponse,
  GetRunResponse,
  ListRunsResponse,
} from './types'

export type { RuntimeHealth, StartRunRequest, StartRunResponse, ResumeRunRequest, ResumeRunResponse, GetRunResponse, ListRunsResponse }

export interface RuntimeClient {
  /** Current runtime health and safety mode. */
  getHealth(): Promise<RuntimeHealth>

  /**
   * Start a new workflow run.
   * mock  → in-memory 5-step simulation
   * local → POST /api/runs to LocalWorkflowRunner
   * remote → POST to cloud API
   */
  startRun(request: StartRunRequest): Promise<StartRunResponse>

  /** Get the current state of a run. */
  getRun(runId: string): Promise<GetRunResponse>

  /** List all runs visible to this client. */
  listRuns(): Promise<ListRunsResponse>

  /**
   * Resume a paused run with a human review decision.
   * Governance rule: run must be in status=paused (at HumanReviewStep boundary).
   */
  resumeRun(runId: string, request: ResumeRunRequest): Promise<ResumeRunResponse>

  /** Cancel a run. */
  cancelRun(runId: string): Promise<GetRunResponse>
}

// WorkflowClient is an alias for backward compatibility with existing imports.
// New code should use RuntimeClient.
export type WorkflowClient = RuntimeClient
