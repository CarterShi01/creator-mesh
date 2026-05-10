import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSession,
  getCurrentSession,
  connectSurface,
  disconnectSurface,
  startPairing,
  completePairing,
  listEvents,
  isSessionError,
  resetStore,
} from '../sessionStore'

beforeEach(() => {
  resetStore()
})

describe('createSession', () => {
  it('creates a session with idle status and empty surfaces', () => {
    const session = createSession()
    expect(session.status).toBe('idle')
    expect(session.surfaces).toEqual([])
    expect(session.pairing).toBeNull()
    expect(session.activeRunId).toBeNull()
    expect(session.sessionId).toBeTruthy()
  })

  it('makes the new session the current session', () => {
    const session = createSession()
    expect(getCurrentSession()?.sessionId).toBe(session.sessionId)
  })

  it('emits a session.created event', () => {
    const session = createSession()
    const events = listEvents(session.sessionId)
    expect(events.some(e => e.type === 'session.created')).toBe(true)
  })
})

describe('getCurrentSession', () => {
  it('returns null before any session is created', () => {
    expect(getCurrentSession()).toBeNull()
  })

  it('returns the most recently created session', () => {
    const session = createSession()
    expect(getCurrentSession()?.sessionId).toBe(session.sessionId)
  })
})

describe('connectSurface', () => {
  it('adds a surface to the session', () => {
    const session = createSession()
    connectSurface(session.sessionId, {
      surfaceId: 'surf-1',
      kind: 'web',
      role: 'host',
      connectionStatus: 'connected',
      label: 'Test Host',
    })
    const updated = getCurrentSession()
    expect(updated?.surfaces).toHaveLength(1)
    expect(updated?.surfaces[0].surfaceId).toBe('surf-1')
    expect(updated?.surfaces[0].kind).toBe('web')
  })

  it('replaces an existing surface with the same surfaceId', () => {
    const session = createSession()
    connectSurface(session.sessionId, {
      surfaceId: 'surf-1', kind: 'web', role: 'host',
      connectionStatus: 'connected', label: 'Old Label',
    })
    connectSurface(session.sessionId, {
      surfaceId: 'surf-1', kind: 'web', role: 'host',
      connectionStatus: 'connected', label: 'New Label',
    })
    expect(getCurrentSession()?.surfaces).toHaveLength(1)
    expect(getCurrentSession()?.surfaces[0].label).toBe('New Label')
  })

  it('returns error for unknown sessionId', () => {
    const result = connectSurface('no-session', {
      surfaceId: 'x', kind: 'web', role: 'host',
      connectionStatus: 'connected', label: 'X',
    })
    expect(isSessionError(result)).toBe(true)
  })

  it('emits a surface.connected event', () => {
    const session = createSession()
    connectSurface(session.sessionId, {
      surfaceId: 'surf-1', kind: 'web', role: 'host',
      connectionStatus: 'connected', label: 'Host',
    })
    const events = listEvents(session.sessionId)
    expect(events.some(e => e.type === 'surface.connected')).toBe(true)
  })
})

describe('disconnectSurface', () => {
  it('marks the surface as disconnected', () => {
    const session = createSession()
    connectSurface(session.sessionId, {
      surfaceId: 'surf-1', kind: 'web', role: 'host',
      connectionStatus: 'connected', label: 'Host',
    })
    disconnectSurface(session.sessionId, 'surf-1')
    const surface = getCurrentSession()?.surfaces.find(s => s.surfaceId === 'surf-1')
    expect(surface?.connectionStatus).toBe('disconnected')
  })

  it('returns error for unknown surface', () => {
    const session = createSession()
    const result = disconnectSurface(session.sessionId, 'nonexistent')
    expect(isSessionError(result)).toBe(true)
  })
})

describe('startPairing', () => {
  it('returns a pairing state with 6-character code', () => {
    const session = createSession()
    const result = startPairing(session.sessionId)
    expect(isSessionError(result)).toBe(false)
    if (!isSessionError(result)) {
      expect(result.code).toHaveLength(6)
      expect(result.status).toBe('active')
      expect(result.ttlMs).toBe(5 * 60 * 1000)
    }
  })

  it('returns error when session does not exist', () => {
    const result = startPairing('no-session')
    expect(isSessionError(result)).toBe(true)
    if (isSessionError(result)) {
      expect(result.code).toBe('session.not_found')
    }
  })

  it('returns error when pairing is already active', () => {
    const session = createSession()
    startPairing(session.sessionId)
    const second = startPairing(session.sessionId)
    expect(isSessionError(second)).toBe(true)
    if (isSessionError(second)) {
      expect(second.code).toBe('pairing.already_active')
    }
  })

  it('emits a bridge.pairing_started event', () => {
    const session = createSession()
    startPairing(session.sessionId)
    const events = listEvents(session.sessionId)
    expect(events.some(e => e.type === 'bridge.pairing_started')).toBe(true)
  })
})

describe('completePairing', () => {
  it('connects a controller surface with the correct code', () => {
    const session = createSession()
    const pairing = startPairing(session.sessionId)
    if (isSessionError(pairing)) throw new Error('pairing failed')

    const result = completePairing(session.sessionId, pairing.code, {
      surfaceId: 'ctrl-1', kind: 'mobile-ios', role: 'controller',
      connectionStatus: 'pairing', label: 'iPhone Controller',
    })
    expect(isSessionError(result)).toBe(false)
    if (!isSessionError(result)) {
      expect(result.connectionStatus).toBe('connected')
      expect(result.role).toBe('controller')
    }
  })

  it('adds the controller to the session surfaces', () => {
    const session = createSession()
    const pairing = startPairing(session.sessionId)
    if (isSessionError(pairing)) throw new Error('pairing failed')

    completePairing(session.sessionId, pairing.code, {
      surfaceId: 'ctrl-1', kind: 'web', role: 'controller',
      connectionStatus: 'pairing', label: 'Web Controller',
    })
    expect(getCurrentSession()?.surfaces.some(s => s.surfaceId === 'ctrl-1')).toBe(true)
  })

  it('returns error for invalid pairing code', () => {
    const session = createSession()
    startPairing(session.sessionId)
    const result = completePairing(session.sessionId, 'WRONG1', {
      surfaceId: 'ctrl-1', kind: 'web', role: 'controller',
      connectionStatus: 'pairing', label: 'Web',
    })
    expect(isSessionError(result)).toBe(true)
    if (isSessionError(result)) {
      expect(result.code).toBe('pairing.invalid_code')
    }
  })

  it('returns error when no pairing is active', () => {
    const session = createSession()
    const result = completePairing(session.sessionId, 'ABCDEF', {
      surfaceId: 'ctrl-1', kind: 'web', role: 'controller',
      connectionStatus: 'pairing', label: 'Web',
    })
    expect(isSessionError(result)).toBe(true)
    if (isSessionError(result)) {
      expect(result.code).toBe('pairing.expired')
    }
  })
})

describe('listEvents', () => {
  it('accumulates events across session lifecycle', () => {
    const session = createSession()
    connectSurface(session.sessionId, {
      surfaceId: 's1', kind: 'web', role: 'host',
      connectionStatus: 'connected', label: 'Host',
    })
    startPairing(session.sessionId)
    const events = listEvents(session.sessionId)
    // session.created + surface.connected + bridge.pairing_started
    expect(events.length).toBeGreaterThanOrEqual(3)
  })

  it('returns empty array for unknown sessionId', () => {
    expect(listEvents('unknown')).toEqual([])
  })
})
