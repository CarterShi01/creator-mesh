// Placeholder — full implementation in Task 05.
// This file exists so workflowClient.ts can resolve the dynamic import.

import type { WorkflowClient } from './workflowClient'
import type {
  RuntimeHealth,
  StartRunRequest,
  StartRunResponse,
  ResumeRunRequest,
  ResumeRunResponse,
  GetRunResponse,
  ListRunsResponse,
} from './types'
import { RunLedger } from './runLedger'

export class MockRuntimeClient implements WorkflowClient {
  private ledger = new RunLedger()

  async getHealth(): Promise<RuntimeHealth> {
    return {
      mode: 'mock',
      externalSideEffectsEnabled: false,
      notionConnected: false,
      anthropicConnected: false,
      desktopShellAvailable: false,
      safetyMode: 'mock-only',
    }
  }

  async startRun(_request: StartRunRequest): Promise<StartRunResponse> {
    return { run: this.ledger.listRuns()[0] ?? (() => { throw new Error('not implemented') })() }
  }

  async getRun(runId: string): Promise<GetRunResponse> {
    return { run: this.ledger.getRun(runId) }
  }

  async listRuns(): Promise<ListRunsResponse> {
    return { runs: this.ledger.listRuns() }
  }

  async resumeRun(_runId: string, _request: ResumeRunRequest): Promise<ResumeRunResponse> {
    return { run: this.ledger.listRuns()[0] ?? (() => { throw new Error('not implemented') })() }
  }

  async cancelRun(runId: string): Promise<GetRunResponse> {
    return { run: this.ledger.getRun(runId) }
  }
}
