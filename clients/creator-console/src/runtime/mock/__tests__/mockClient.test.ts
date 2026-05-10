import { describe, it, expect, beforeEach } from 'vitest'
import { MockRuntimeClient } from '../mockClient'

describe('MockRuntimeClient', () => {
  let client: MockRuntimeClient

  beforeEach(() => {
    client = new MockRuntimeClient()
  })

  // ── getHealth ──────────────────────────────────────────────────────────────

  describe('getHealth()', () => {
    it('reports mock mode with no external side effects', async () => {
      const health = await client.getHealth()
      expect(health.mode).toBe('mock')
      expect(health.externalSideEffectsEnabled).toBe(false)
      expect(health.notionConnected).toBe(false)
      expect(health.anthropicConnected).toBe(false)
      expect(health.safetyMode).toBe('mock-only')
    })
  })

  // ── startRun ──────────────────────────────────────────────────────────────

  describe('startRun()', () => {
    it('returns a run paused at human review boundary', async () => {
      const { run } = await client.startRun({
        inputKind: 'thought',
        inputText: 'I want to build a creator tool',
        target: 'My Notes',
      })
      expect(run.status).toBe('paused')
      expect(run.inputKind).toBe('thought')
      expect(run.inputText).toBe('I want to build a creator tool')
      expect(run.target).toBe('My Notes')
    })

    it('populates 5 workflow steps', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      expect(run.steps).toHaveLength(5)
      const types = run.steps.map(s => s.type)
      expect(types).toEqual(['capture', 'classify', 'structure', 'human_review', 'output'])
    })

    it('marks capture/classify/structure as completed and human_review as paused', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const byType = Object.fromEntries(run.steps.map(s => [s.type, s.status]))
      expect(byType['capture']).toBe('completed')
      expect(byType['classify']).toBe('completed')
      expect(byType['structure']).toBe('completed')
      expect(byType['human_review']).toBe('paused')
      expect(byType['output']).toBe('pending')
    })

    it('generates 3 initial governance decisions', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      expect(run.governanceDecisions).toHaveLength(3)
    })

    it('marks output step governance as needs_review before human approval', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const outputDecision = run.governanceDecisions.find(d => d.stepId === 'write-output')
      expect(outputDecision?.outcome).toBe('needs_review')
      expect(outputDecision?.permissionLevel).toBe('external_side_effect')
    })

    it('derives classification from input', async () => {
      const { run } = await client.startRun({
        inputKind: 'message',
        inputText: 'Client feedback on the landing page',
        target: 'Work DB',
      })
      expect(run.classification.category).toBe('Task Planning')
      expect(run.classification.confidence).toBe(0.91)
    })

    it('each run gets a unique runId', async () => {
      const { run: r1 } = await client.startRun({ inputKind: 'thought', inputText: 'a', target: 't' })
      const { run: r2 } = await client.startRun({ inputKind: 'thought', inputText: 'b', target: 't' })
      expect(r1.runId).not.toBe(r2.runId)
    })
  })

  // ── getRun / listRuns ──────────────────────────────────────────────────────

  describe('getRun()', () => {
    it('returns the run created by startRun', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: fetched } = await client.getRun(run.runId)
      expect(fetched?.runId).toBe(run.runId)
    })

    it('returns null run for unknown id', async () => {
      const { run } = await client.getRun('nonexistent')
      expect(run).toBeNull()
    })
  })

  describe('listRuns()', () => {
    it('returns all started runs', async () => {
      await client.startRun({ inputKind: 'thought', inputText: 'a', target: 't' })
      await client.startRun({ inputKind: 'message', inputText: 'b', target: 't' })
      const { runs } = await client.listRuns()
      expect(runs).toHaveLength(2)
    })
  })

  // ── resumeRun — accepted ───────────────────────────────────────────────────

  describe('resumeRun() — accepted', () => {
    it('transitions run to completed status', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'accepted' })
      expect(resumed.status).toBe('completed')
    })

    it('populates result with mock artifact URL', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'accepted' })
      expect(resumed.result?.isMock).toBe(true)
      expect(resumed.result?.artifactUrl).toMatch(/^https:\/\/notion\.so\/mock\//)
    })

    it('approves the write-output governance decision', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'accepted' })
      const outputDecisions = resumed.governanceDecisions.filter(d => d.stepId === 'write-output')
      const finalDecision = outputDecisions[outputDecisions.length - 1]
      expect(finalDecision.outcome).toBe('approved')
    })

    it('marks human_review and output steps as completed', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'accepted' })
      const byType = Object.fromEntries(resumed.steps.map(s => [s.type, s.status]))
      expect(byType['human_review']).toBe('completed')
      expect(byType['output']).toBe('completed')
    })
  })

  // ── resumeRun — rejected ───────────────────────────────────────────────────

  describe('resumeRun() — rejected', () => {
    it('transitions run to rejected status', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'rejected' })
      expect(resumed.status).toBe('rejected')
    })

    it('skips the output step', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'rejected' })
      const outputStep = resumed.steps.find(s => s.type === 'output')
      expect(outputStep?.status).toBe('skipped')
    })

    it('produces no result artifact', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, { decision: 'rejected' })
      expect(resumed.result).toBeUndefined()
    })
  })

  // ── resumeRun — changes_requested ─────────────────────────────────────────

  describe('resumeRun() — changes_requested', () => {
    it('transitions run to changes_requested status', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, {
        decision: 'changes_requested',
        feedback: 'Add more detail',
      })
      expect(resumed.status).toBe('changes_requested')
    })

    it('stores the feedback on the review record', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: resumed } = await client.resumeRun(run.runId, {
        decision: 'changes_requested',
        feedback: 'Please add sources',
      })
      expect(resumed.review.feedback).toBe('Please add sources')
    })
  })

  // ── resumeRun — guard rails ────────────────────────────────────────────────

  describe('resumeRun() — error cases', () => {
    it('returns error when run does not exist', async () => {
      const { error } = await client.resumeRun('nonexistent', { decision: 'accepted' })
      expect(error?.code).toBe('run.not_found')
    })

    it('returns error when run is not paused', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      await client.resumeRun(run.runId, { decision: 'accepted' }) // completes the run
      const { error } = await client.resumeRun(run.runId, { decision: 'accepted' })
      expect(error?.code).toBe('run.not_paused')
    })
  })

  // ── cancelRun ─────────────────────────────────────────────────────────────

  describe('cancelRun()', () => {
    it('transitions run to cancelled status', async () => {
      const { run } = await client.startRun({ inputKind: 'thought', inputText: 'x', target: 't' })
      const { run: cancelled } = await client.cancelRun(run.runId)
      expect(cancelled?.status).toBe('cancelled')
    })

    it('returns error when run does not exist', async () => {
      const { error } = await client.cancelRun('nope')
      expect(error?.code).toBe('run.not_found')
    })
  })
})
