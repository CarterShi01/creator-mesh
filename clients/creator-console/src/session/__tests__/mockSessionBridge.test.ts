import { describe, it, expect } from 'vitest'
import { getSessionBridge, resetSessionBridge } from '../mockSessionBridge'
import { resetStore } from '../sessionStore'
import { getRuntimeClient, resetRuntimeClient } from '../../runtime/workflowClient'

type Bridge = ReturnType<typeof getSessionBridge>

async function setup(): Promise<Bridge> {
  resetStore()
  resetSessionBridge()
  resetRuntimeClient()
  const client = await getRuntimeClient()
  const bridge = getSessionBridge()
  bridge.setWorkflowClient(client)
  return bridge
}

describe('MockSessionBridge', () => {

  // ── getBridgeHealth ────────────────────────────────────────────────────────

  describe('getBridgeHealth()', () => {
    it('reports mock bridge mode with no active session initially', async () => {
      const bridge = await setup()
      const health = bridge.getBridgeHealth()
      expect(health.bridgeMode).toBe('mock')
      expect(health.sessionActive).toBe(false)
      expect(health.externalSideEffects).toBe(false)
    })
  })

  // ── createHostSession ──────────────────────────────────────────────────────

  describe('createHostSession()', () => {
    it('creates a session and registers the current surface as host', async () => {
      const bridge = await setup()
      const session = bridge.createHostSession()
      expect(session.sessionId).toBeTruthy()
      expect(session.status).toBe('idle')
      expect(session.surfaces).toHaveLength(1)
      expect(session.surfaces[0].role).toBe('host')
    })

    it('makes the session current', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      expect(bridge.getCurrentSession()).not.toBeNull()
    })

    it('reports sessionActive=true in bridge health', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      expect(bridge.getBridgeHealth().sessionActive).toBe(true)
    })
  })

  // ── startPairing ──────────────────────────────────────────────────────────

  describe('startPairing()', () => {
    it('generates a pairing code after host session is created', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const result = bridge.startPairing()
      expect('code' in result).toBe(true)
      if ('code' in result && 'status' in result) {
        expect((result as { code: string }).code).toHaveLength(6)
      }
    })

    it('returns error when no session exists', async () => {
      const bridge = await setup()
      const result = bridge.startPairing()
      expect('code' in result && 'message' in result).toBe(true)
    })
  })

  // ── connectController ──────────────────────────────────────────────────────

  describe('connectController()', () => {
    it('connects a controller surface with valid pairing code', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const pairing = bridge.startPairing()
      if (!('ttlMs' in pairing)) throw new Error('pairing failed')

      const result = bridge.connectController(pairing.code, 'Test Controller')
      expect('surfaceId' in result).toBe(true)
      if ('surfaceId' in result) {
        expect(result.role).toBe('controller')
        expect(result.connectionStatus).toBe('connected')
      }
    })

    it('adds controller to session surfaces', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const pairing = bridge.startPairing()
      if (!('ttlMs' in pairing)) throw new Error('pairing failed')

      bridge.connectController(pairing.code)
      const session = bridge.getCurrentSession()
      const controllers = session?.surfaces.filter(s => s.role === 'controller')
      expect(controllers?.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── sendCommand — start_run ────────────────────────────────────────────────

  describe('sendCommand("start_run")', () => {
    it('creates a workflow run and updates session activeRunId', async () => {
      const bridge = await setup()
      bridge.createHostSession()

      const result = await bridge.sendCommand({
        type: 'start_run',
        sourceSurfaceId: 'ctrl-test',
        sessionId: bridge.getCurrentSession()!.sessionId,
        params: { inputKind: 'thought', content: 'Remote test thought' },
      })
      expect(result.ok).toBe(true)
      expect(bridge.getCurrentSession()?.activeRunId).toBeTruthy()
    })

    it('emits a run.started event', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      await bridge.sendCommand({
        type: 'start_run',
        sourceSurfaceId: 'ctrl-test',
        sessionId,
      })
      const events = bridge.listEvents()
      expect(events.some(e => e.type === 'run.started')).toBe(true)
    })
  })

  // ── sendCommand — accept_review ────────────────────────────────────────────

  describe('sendCommand("accept_review")', () => {
    it('resumes the active run with accepted decision', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { inputKind: 'thought', content: 'Test' },
      })
      const runId = bridge.getCurrentSession()?.activeRunId
      expect(runId).toBeTruthy()

      const result = await bridge.sendCommand({
        type: 'accept_review', sourceSurfaceId: 'ctrl-test', sessionId,
      })
      expect(result.ok).toBe(true)

      const events = bridge.listEvents()
      expect(events.some(e => e.type === 'human.accepted')).toBe(true)
    })
  })

  // ── sendCommand — reject_review ────────────────────────────────────────────

  describe('sendCommand("reject_review")', () => {
    it('resumes the active run with rejected decision', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { inputKind: 'thought', content: 'Test' },
      })

      const result = await bridge.sendCommand({
        type: 'reject_review', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { feedback: 'Not ready' },
      })
      expect(result.ok).toBe(true)

      const events = bridge.listEvents()
      expect(events.some(e => e.type === 'human.rejected')).toBe(true)
    })
  })

  // ── sendCommand — cancel_run ───────────────────────────────────────────────

  describe('sendCommand("cancel_run")', () => {
    it('cancels the active run', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { inputKind: 'thought', content: 'Test' },
      })

      const result = await bridge.sendCommand({
        type: 'cancel_run', sourceSurfaceId: 'ctrl-test', sessionId,
      })
      expect(result.ok).toBe(true)
      expect(bridge.getCurrentSession()?.activeRunId).toBeNull()
    })
  })

  // ── sendCommand — guard rails ──────────────────────────────────────────────

  describe('sendCommand() — error cases', () => {
    it('returns error when no session exists', async () => {
      const bridge = await setup()
      const result = await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId: 'nope',
      })
      expect(result.ok).toBe(false)
    })

    it('returns error for accept_review when no run is active', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      const result = await bridge.sendCommand({
        type: 'accept_review', sourceSurfaceId: 'ctrl-test', sessionId,
      })
      expect(result.ok).toBe(false)
    })
  })

  // ── subscribeToEvents ──────────────────────────────────────────────────────

  describe('subscribeToEvents()', () => {
    it('calls callback when a command triggers an event', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      const received: string[] = []
      const unsub = bridge.subscribeToEvents(evt => received.push(evt.type))

      await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { inputKind: 'thought', content: 'Test' },
      })

      expect(received.length).toBeGreaterThan(0)
      unsub()
    })

    it('stops receiving events after unsubscribe', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      const received: string[] = []
      const unsub = bridge.subscribeToEvents(evt => received.push(evt.type))
      unsub()

      await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { inputKind: 'thought', content: 'Test' },
      })

      expect(received).toHaveLength(0)
    })
  })

  // ── listEvents ─────────────────────────────────────────────────────────────

  describe('listEvents()', () => {
    it('returns empty array when no session exists', async () => {
      const bridge = await setup()
      expect(bridge.listEvents()).toEqual([])
    })

    it('returns all session events after activity', async () => {
      const bridge = await setup()
      bridge.createHostSession()
      const sessionId = bridge.getCurrentSession()!.sessionId

      await bridge.sendCommand({
        type: 'start_run', sourceSurfaceId: 'ctrl-test', sessionId,
        params: { inputKind: 'thought', content: 'Test' },
      })

      expect(bridge.listEvents().length).toBeGreaterThan(0)
    })
  })
})
