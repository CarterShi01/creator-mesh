// Governed Mock Runtime Client.
// Implements WorkflowClient using in-memory state only.
// All workflow actions produce the same product experience as the original mock,
// but now go through RunLedger with GovernanceDecision records.
//
// Maps to: future LocalRuntimeClient → LocalWorkflowRunner → Orchestrator + GovernanceEvaluator

import type { RuntimeClient as WorkflowClient } from '../client'
import type {
  RuntimeHealth,
  RuntimeRun,
  RuntimeStep,
  RuntimeClassification,
  RuntimeGovernanceDecision,
  StartRunRequest,
  StartRunResponse,
  ResumeRunRequest,
  ResumeRunResponse,
  GetRunResponse,
  ListRunsResponse,
} from '../types'
import { RunLedger } from './runLedger'
import { detectSurface } from '../../surface/detector'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function now(): string {
  return new Date().toISOString()
}

function makeInitialSteps(): RuntimeStep[] {
  return [
    {
      id: 'capture-input',
      label: 'Capture',
      type: 'capture',
      status: 'completed',
      description: 'Input received and normalized.',
      completedAt: now(),
    },
    {
      id: 'classify-input',
      label: 'Classify',
      type: 'classify',
      status: 'completed',
      description: 'Input classified by mock AI agent (confidence: 91%).',
      completedAt: now(),
    },
    {
      id: 'generate-structure',
      label: 'Structure',
      type: 'structure',
      status: 'completed',
      description: 'Structured output draft generated.',
      completedAt: now(),
    },
    {
      id: 'human-review',
      label: 'Human Review',
      type: 'human_review',
      status: 'paused',
      description: 'Awaiting human approval before external write.',
    },
    {
      id: 'write-output',
      label: 'Output',
      type: 'output',
      status: 'pending',
      description: 'Write artifact to target (mock Notion page).',
    },
  ]
}

function deriveClassification(
  inputText: string,
  inputKind: 'thought' | 'message',
  target: string,
): RuntimeClassification {
  const isThought = inputKind === 'thought'
  return {
    suggestedTitle: isThought
      ? 'Creator Tool Concept: Idea-to-Plan Pipeline'
      : 'Meeting Notes → Project Plan Conversion',
    category: isThought ? 'Product Idea' : 'Task Planning',
    summary: inputText.length > 80 ? inputText.slice(0, 80) + '…' : inputText,
    confidence: 0.91,
    proposedOutput: `Create a structured page in "${target}" with title, context, action items, and success criteria.`,
  }
}

function makeInitialGovernanceDecisions(_runId: string): Omit<RuntimeGovernanceDecision, 'id' | 'decidedAt'>[] {
  return [
    {
      stepId: 'classify-input',
      stepLabel: 'Classify',
      outcome: 'auto_approved',
      reason: 'Classification is a safe-read operation. No external side effects.',
      permissionLevel: 'safe_read',
    },
    {
      stepId: 'generate-structure',
      stepLabel: 'Structure',
      outcome: 'auto_approved',
      reason: 'Structure generation is a safe-read operation. No external side effects.',
      permissionLevel: 'safe_read',
    },
    {
      stepId: 'write-output',
      stepLabel: 'Output',
      outcome: 'needs_review',
      reason: 'Write to external connector (Notion) requires prior human review acceptance.',
      permissionLevel: 'external_side_effect',
    },
  ]
}

function updateStep(steps: RuntimeStep[], id: string, status: RuntimeStep['status'], completedAt?: string): RuntimeStep[] {
  return steps.map(s => s.id === id ? { ...s, status, ...(completedAt ? { completedAt } : {}) } : s)
}

// ─── MockRuntimeClient ────────────────────────────────────────────────────────

export class MockRuntimeClient implements WorkflowClient {
  private ledger = new RunLedger()

  async getHealth(): Promise<RuntimeHealth> {
    const surface = detectSurface()
    return {
      mode: 'mock',
      externalSideEffectsEnabled: false,
      notionConnected: false,
      anthropicConnected: false,
      desktopShellAvailable: surface.kind === 'tauri',
      safetyMode: 'mock-only',
    }
  }

  async startRun(request: StartRunRequest): Promise<StartRunResponse> {
    const runId = uid()
    const timestamp = now()

    const run: RuntimeRun = {
      runId,
      inputKind: request.inputKind,
      inputText: request.inputText,
      target: request.target,
      status: 'paused',
      steps: makeInitialSteps(),
      classification: deriveClassification(request.inputText, request.inputKind, request.target),
      review: { decision: 'pending' },
      governanceDecisions: [],
      events: [],
      result: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.ledger.createRun(run)
    this.ledger.appendEvent(runId, 'run.created', `Run started: ${request.inputKind} input`)

    // Record initial governance decisions
    for (const decision of makeInitialGovernanceDecisions(runId)) {
      this.ledger.appendGovernanceDecision(runId, decision)
    }

    this.ledger.appendEvent(runId, 'run.paused', 'Paused at human review boundary')

    return { run: this.ledger.getRun(runId)! }
  }

  async getRun(runId: string): Promise<GetRunResponse> {
    return { run: this.ledger.getRun(runId) }
  }

  async listRuns(): Promise<ListRunsResponse> {
    return { runs: this.ledger.listRuns() }
  }

  async resumeRun(runId: string, request: ResumeRunRequest): Promise<ResumeRunResponse> {
    const run = this.ledger.getRun(runId)
    if (!run) {
      return { run: null as unknown as RuntimeRun, error: { code: 'run.not_found', message: `Run ${runId} not found` } }
    }
    if (run.status !== 'paused') {
      return { run, error: { code: 'run.not_paused', message: `Run ${runId} is not paused` } }
    }

    const reviewedAt = now()

    if (request.decision === 'accepted') {
      this.ledger.appendHumanDecision(runId, { decision: 'accepted', reviewedAt })
      this.ledger.appendEvent(runId, 'human.accepted')

      // Governance: write-output approved by human review
      this.ledger.appendGovernanceDecision(runId, {
        stepId: 'write-output',
        stepLabel: 'Output',
        outcome: 'approved',
        reason: 'Human reviewer accepted — write to external connector now permitted.',
        permissionLevel: 'external_side_effect',
      })
      this.ledger.appendEvent(runId, 'step.completed', 'human-review completed')
      this.ledger.appendEvent(runId, 'step.completed', 'write-output completed (mock Notion write)')
      this.ledger.appendEvent(runId, 'run.completed')

      const updated = this.ledger.updateRun(runId, {
        status: 'completed',
        steps: updateStep(
          updateStep(run.steps, 'human-review', 'completed', reviewedAt),
          'write-output', 'completed', now(),
        ),
        result: {
          title: run.classification.suggestedTitle,
          artifactUrl: `https://notion.so/mock/${runId}`,
          artifactSummary: `Page created in "${run.target}": ${run.classification.suggestedTitle}. Contains context, action items, and success criteria.`,
          nextSuggestedAction: 'Review the draft page and assign action items to team members.',
          isMock: true,
        },
      })
      return { run: updated! }
    }

    if (request.decision === 'rejected') {
      this.ledger.appendHumanDecision(runId, { decision: 'rejected', reviewedAt })
      this.ledger.appendEvent(runId, 'human.rejected')

      const updated = this.ledger.updateRun(runId, {
        status: 'rejected',
        steps: updateStep(
          updateStep(run.steps, 'human-review', 'rejected', reviewedAt),
          'write-output', 'skipped',
        ),
      })
      return { run: updated! }
    }

    if (request.decision === 'changes_requested') {
      this.ledger.appendHumanDecision(runId, {
        decision: 'changes_requested',
        feedback: request.feedback,
        reviewedAt,
      })
      this.ledger.appendEvent(runId, 'human.changes_requested', request.feedback)

      const updated = this.ledger.updateRun(runId, {
        status: 'changes_requested',
        steps: updateStep(run.steps, 'human-review', 'paused'),
      })
      return { run: updated! }
    }

    return { run, error: { code: 'invalid.decision', message: `Unknown decision: ${request.decision}` } }
  }

  async cancelRun(runId: string): Promise<GetRunResponse> {
    const run = this.ledger.getRun(runId)
    if (!run) return { run: null, error: { code: 'run.not_found', message: `Run ${runId} not found` } }

    this.ledger.appendEvent(runId, 'run.cancelled')
    const updated = this.ledger.updateRun(runId, { status: 'cancelled' })
    return { run: updated }
  }
}
