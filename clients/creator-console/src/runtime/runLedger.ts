// Placeholder — full implementation in Task 04.
import type { RuntimeRun } from './types'

export class RunLedger {
  private runs: Map<string, RuntimeRun> = new Map()

  getRun(runId: string): RuntimeRun | null {
    return this.runs.get(runId) ?? null
  }

  listRuns(): RuntimeRun[] {
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  createRun(run: RuntimeRun): RuntimeRun {
    this.runs.set(run.runId, run)
    return run
  }

  updateRun(runId: string, updates: Partial<RuntimeRun>): RuntimeRun | null {
    const existing = this.runs.get(runId)
    if (!existing) return null
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.runs.set(runId, updated)
    return updated
  }
}
