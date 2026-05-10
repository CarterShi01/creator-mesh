import { describe, it, expect, beforeEach } from 'vitest'
import { RunLedger } from '../runLedger'
import type { RuntimeRun } from '../../types'

function makeRun(overrides: Partial<RuntimeRun> = {}): RuntimeRun {
  const now = new Date().toISOString()
  return {
    runId: 'test-run-1',
    inputKind: 'thought',
    inputText: 'Test input',
    target: 'test-target',
    status: 'running',
    steps: [],
    classification: {
      suggestedTitle: 'Test Title',
      category: 'Test',
      summary: 'Summary',
      confidence: 0.9,
      proposedOutput: 'Output',
    },
    review: { decision: 'pending' },
    governanceDecisions: [],
    events: [],
    result: undefined,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('RunLedger', () => {
  let ledger: RunLedger

  beforeEach(() => {
    ledger = new RunLedger()
  })

  describe('createRun / getRun', () => {
    it('stores a run and retrieves it by id', () => {
      const run = makeRun()
      ledger.createRun(run)
      expect(ledger.getRun('test-run-1')).toMatchObject({ runId: 'test-run-1' })
    })

    it('returns null for unknown runId', () => {
      expect(ledger.getRun('nonexistent')).toBeNull()
    })
  })

  describe('updateRun', () => {
    it('applies partial updates and refreshes updatedAt', () => {
      const run = makeRun({ updatedAt: '2020-01-01T00:00:00.000Z' })
      ledger.createRun(run)
      const updated = ledger.updateRun('test-run-1', { status: 'completed' })
      expect(updated?.status).toBe('completed')
      expect(updated?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z')
    })

    it('returns null when run does not exist', () => {
      expect(ledger.updateRun('no-such-run', { status: 'cancelled' })).toBeNull()
    })
  })

  describe('listRuns', () => {
    it('returns runs sorted most-recent first', () => {
      ledger.createRun(makeRun({ runId: 'run-A', createdAt: '2024-01-01T00:00:00.000Z' }))
      ledger.createRun(makeRun({ runId: 'run-B', createdAt: '2024-06-01T00:00:00.000Z' }))
      const list = ledger.listRuns()
      expect(list[0].runId).toBe('run-B')
      expect(list[1].runId).toBe('run-A')
    })

    it('returns empty array when no runs', () => {
      expect(ledger.listRuns()).toEqual([])
    })
  })

  describe('appendGovernanceDecision', () => {
    it('adds a decision with generated id and decidedAt', () => {
      ledger.createRun(makeRun())
      ledger.appendGovernanceDecision('test-run-1', {
        stepId: 'classify-input',
        stepLabel: 'Classify',
        outcome: 'auto_approved',
        reason: 'Safe read',
        permissionLevel: 'safe_read',
      })
      const run = ledger.getRun('test-run-1')!
      expect(run.governanceDecisions).toHaveLength(1)
      expect(run.governanceDecisions[0].id).toBeTruthy()
      expect(run.governanceDecisions[0].decidedAt).toBeTruthy()
      expect(run.governanceDecisions[0].outcome).toBe('auto_approved')
    })

    it('returns null when run does not exist', () => {
      const result = ledger.appendGovernanceDecision('missing', {
        stepId: 'x', stepLabel: 'X', outcome: 'denied',
        reason: 'r', permissionLevel: 'safe_read',
      })
      expect(result).toBeNull()
    })
  })

  describe('appendHumanDecision', () => {
    it('records the human review decision on the run', () => {
      ledger.createRun(makeRun())
      ledger.appendHumanDecision('test-run-1', {
        decision: 'accepted',
        reviewedAt: new Date().toISOString(),
      })
      expect(ledger.getRun('test-run-1')?.review.decision).toBe('accepted')
    })
  })

  describe('appendEvent', () => {
    it('appends an event with generated id and timestamp', () => {
      ledger.createRun(makeRun())
      ledger.appendEvent('test-run-1', 'run.created', 'Test detail')
      const run = ledger.getRun('test-run-1')!
      expect(run.events).toHaveLength(1)
      expect(run.events[0].kind).toBe('run.created')
      expect(run.events[0].detail).toBe('Test detail')
      expect(run.events[0].id).toBeTruthy()
    })

    it('accumulates multiple events', () => {
      ledger.createRun(makeRun())
      ledger.appendEvent('test-run-1', 'run.created')
      ledger.appendEvent('test-run-1', 'run.paused')
      ledger.appendEvent('test-run-1', 'human.accepted')
      expect(ledger.getRun('test-run-1')?.events).toHaveLength(3)
    })

    it('returns null when run does not exist', () => {
      expect(ledger.appendEvent('nope', 'run.created')).toBeNull()
    })
  })
})
