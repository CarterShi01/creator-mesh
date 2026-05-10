// In-memory RunLedger — records runs, governance decisions, human decisions, and events.
// No browser storage yet — kept in-memory for Phase 4.
// Maps to: future AuditRecord persistence in src/storage + GovernanceEvaluator audit trail.

import type {
  RuntimeRun,
  RuntimeGovernanceDecision,
  RuntimeHumanDecision,
  RuntimeEvent,
  RuntimeEventKind,
} from '../types'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── RunLedger ───────────────────────────────────────────────────────────────

export class RunLedger {
  private runs: Map<string, RuntimeRun> = new Map()

  // ── Core CRUD ──────────────────────────────────────────────────────────────

  /** Create and store a new run. Returns the created run. */
  createRun(run: RuntimeRun): RuntimeRun {
    this.runs.set(run.runId, run)
    return run
  }

  /** Get a run by id. Returns null (never throws) if not found. */
  getRun(runId: string): RuntimeRun | null {
    return this.runs.get(runId) ?? null
  }

  /**
   * Apply partial updates to a run.
   * Always sets updatedAt to now.
   * Returns updated run, or null if runId not found.
   */
  updateRun(runId: string, updates: Partial<RuntimeRun>): RuntimeRun | null {
    const existing = this.runs.get(runId)
    if (!existing) return null
    const updated: RuntimeRun = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.runs.set(runId, updated)
    return updated
  }

  /** List all runs, most recent first. */
  listRuns(): RuntimeRun[] {
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // ── Governance ─────────────────────────────────────────────────────────────

  /**
   * Append a governance decision to a run's decision log.
   * Maps to: GovernanceEvaluator.evaluate() → AuditRecord write.
   */
  appendGovernanceDecision(runId: string, decision: Omit<RuntimeGovernanceDecision, 'id' | 'decidedAt'>): RuntimeRun | null {
    const run = this.runs.get(runId)
    if (!run) return null
    const full: RuntimeGovernanceDecision = {
      ...decision,
      id: uid(),
      decidedAt: new Date().toISOString(),
    }
    return this.updateRun(runId, {
      governanceDecisions: [...run.governanceDecisions, full],
    })
  }

  // ── Human Decisions ─────────────────────────────────────────────────────────

  /**
   * Record a human review decision on a run.
   * Maps to: HumanReviewStep decision recorded in WorkflowRun.stepOutputs.
   */
  appendHumanDecision(runId: string, decision: RuntimeHumanDecision): RuntimeRun | null {
    return this.updateRun(runId, { review: decision })
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  /**
   * Append a lifecycle event to a run.
   * Maps to: Orchestrator run log / SSE event stream in future real runtime.
   */
  appendEvent(runId: string, kind: RuntimeEventKind, detail?: string): RuntimeRun | null {
    const run = this.runs.get(runId)
    if (!run) return null
    const event: RuntimeEvent = {
      id: uid(),
      runId,
      kind,
      timestamp: new Date().toISOString(),
      detail,
    }
    return this.updateRun(runId, {
      events: [...run.events, event],
    })
  }
}
