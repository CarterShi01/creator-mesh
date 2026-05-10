// In-memory SessionStore for CreatorMesh Session Bridge.
// No persistence — state is lost on page reload by design (Phase A mock).
// Real persistence will come in Phase B when the Mac desktop host exposes a local API.

import type {
  SessionId,
  SurfaceId,
  SurfaceKind,
  SessionStatus,
  CreatorMeshSession,
  ConnectedSurface,
  SessionEvent,
  SessionEventType,
  PairingState,
  PairingCode,
  SessionBridgeError,
} from './types'

// ─── Internal store ──────────────────────────────────────────────────────────

interface StoreState {
  sessions: Map<SessionId, CreatorMeshSession>
  events: Map<SessionId, SessionEvent[]>
  currentSessionId: SessionId | null
  eventSequence: number
}

const store: StoreState = {
  sessions: new Map(),
  events: new Map(),
  currentSessionId: null,
  eventSequence: 0,
}

// ─── ID helpers ──────────────────────────────────────────────────────────────

function shortId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function pairingCode(): PairingCode {
  // 6-character alphanumeric, uppercase, easy to read on screen
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function now(): string {
  return new Date().toISOString()
}

// ─── Event helpers ───────────────────────────────────────────────────────────

function makeEvent(
  sessionId: SessionId,
  type: SessionEventType,
  message: string,
  sourceSurfaceId: SurfaceId | null = null,
  payload?: Record<string, unknown>,
): SessionEvent {
  store.eventSequence += 1
  return {
    eventId: `evt-${store.eventSequence}-${Date.now().toString(36)}`,
    sessionId,
    type,
    sourceSurfaceId,
    timestamp: now(),
    message,
    payload,
  }
}

function pushEvent(sessionId: SessionId, event: SessionEvent): void {
  const list = store.events.get(sessionId) ?? []
  list.push(event)
  store.events.set(sessionId, list)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createSession(): CreatorMeshSession {
  const sessionId = shortId('sess')
  const t = now()
  const session: CreatorMeshSession = {
    sessionId,
    status: 'idle',
    createdAt: t,
    updatedAt: t,
    surfaces: [],
    pairing: null,
    activeRunId: null,
  }
  store.sessions.set(sessionId, session)
  store.events.set(sessionId, [])
  store.currentSessionId = sessionId

  pushEvent(
    sessionId,
    makeEvent(sessionId, 'session.created', `Session ${sessionId} created`),
  )

  return { ...session }
}

export function getSession(sessionId: SessionId): CreatorMeshSession | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) {
    return { code: 'session.not_found', message: `Session ${sessionId} not found` }
  }
  return {
    ...session,
    surfaces: session.surfaces.map(s => ({ ...s })),
  }
}

export function getCurrentSession(): CreatorMeshSession | null {
  if (!store.currentSessionId) return null
  const result = getSession(store.currentSessionId)
  if ('code' in result) return null
  return result
}

export function connectSurface(
  sessionId: SessionId,
  surface: Omit<ConnectedSurface, 'connectedAt' | 'lastSeenAt'>,
): ConnectedSurface | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }

  const t = now()
  const connected: ConnectedSurface = { ...surface, connectedAt: t, lastSeenAt: t }

  // Replace if same surfaceId, otherwise append
  const idx = session.surfaces.findIndex(s => s.surfaceId === surface.surfaceId)
  if (idx >= 0) {
    session.surfaces[idx] = connected
  } else {
    session.surfaces.push(connected)
  }
  session.updatedAt = t
  store.sessions.set(sessionId, session)

  pushEvent(
    sessionId,
    makeEvent(
      sessionId,
      'surface.connected',
      `${connected.label} (${connected.kind}) connected as ${connected.role}`,
      connected.surfaceId,
      { surfaceId: connected.surfaceId, kind: connected.kind, role: connected.role },
    ),
  )

  return { ...connected }
}

export function disconnectSurface(
  sessionId: SessionId,
  surfaceId: SurfaceId,
): void | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }

  const surface = session.surfaces.find(s => s.surfaceId === surfaceId)
  if (!surface) return { code: 'surface.not_found', message: `Surface ${surfaceId} not found` }

  surface.connectionStatus = 'disconnected'
  surface.lastSeenAt = now()
  session.updatedAt = now()
  store.sessions.set(sessionId, session)

  pushEvent(
    sessionId,
    makeEvent(
      sessionId,
      'surface.disconnected',
      `${surface.label} (${surface.kind}) disconnected`,
      surfaceId,
    ),
  )
}

export function appendEvent(sessionId: SessionId, event: SessionEvent): void | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }
  pushEvent(sessionId, event)
  session.updatedAt = now()
  store.sessions.set(sessionId, session)
}

export function listEvents(sessionId: SessionId): SessionEvent[] {
  return (store.events.get(sessionId) ?? []).slice()
}

export function updateSessionStatus(
  sessionId: SessionId,
  status: SessionStatus,
  activeRunId?: string | null,
): void | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }
  session.status = status
  session.updatedAt = now()
  if (activeRunId !== undefined) {
    session.activeRunId = activeRunId
  }
  store.sessions.set(sessionId, session)
}

export function startPairing(sessionId: SessionId): PairingState | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }
  if (session.pairing?.status === 'active') {
    return { code: 'pairing.already_active', message: 'Pairing already in progress' }
  }

  const ttlMs = 5 * 60 * 1000 // 5 minutes
  const startedAt = now()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()
  const state: PairingState = {
    code: pairingCode(),
    startedAt,
    expiresAt,
    ttlMs,
    status: 'active',
  }
  session.pairing = state
  session.updatedAt = startedAt
  store.sessions.set(sessionId, session)

  pushEvent(
    sessionId,
    makeEvent(
      sessionId,
      'bridge.pairing_started',
      `Pairing started — code: ${state.code} (expires in 5 min)`,
      null,
      { code: state.code, expiresAt },
    ),
  )

  return { ...state }
}

export function completePairing(
  sessionId: SessionId,
  code: PairingCode,
  surface: Omit<ConnectedSurface, 'connectedAt' | 'lastSeenAt'>,
): ConnectedSurface | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }

  const pairing = session.pairing
  if (!pairing || pairing.status !== 'active') {
    return { code: 'pairing.expired', message: 'No active pairing session' }
  }
  if (new Date(pairing.expiresAt).getTime() < Date.now()) {
    pairing.status = 'expired'
    store.sessions.set(sessionId, session)
    return { code: 'pairing.expired', message: 'Pairing code expired' }
  }
  if (pairing.code !== code) {
    return { code: 'pairing.invalid_code', message: 'Invalid pairing code' }
  }

  pairing.status = 'completed'
  session.updatedAt = now()
  store.sessions.set(sessionId, session)

  pushEvent(
    sessionId,
    makeEvent(
      sessionId,
      'bridge.pairing_completed',
      `Pairing completed — ${surface.label} joined as ${surface.role}`,
      surface.surfaceId,
    ),
  )

  return connectSurface(sessionId, { ...surface, connectionStatus: 'connected' }) as ConnectedSurface
}

export function expirePairing(sessionId: SessionId): void | SessionBridgeError {
  const session = store.sessions.get(sessionId)
  if (!session) return { code: 'session.not_found', message: `Session ${sessionId} not found` }

  if (session.pairing) {
    session.pairing.status = 'expired'
    session.updatedAt = now()
    store.sessions.set(sessionId, session)

    pushEvent(
      sessionId,
      makeEvent(sessionId, 'bridge.pairing_expired', 'Pairing code expired or cancelled'),
    )
  }
}

export function recordEvent(
  sessionId: SessionId,
  type: SessionEventType,
  message: string,
  sourceSurfaceId: SurfaceId | null = null,
  payload?: Record<string, unknown>,
): SessionEvent {
  const event = makeEvent(sessionId, type, message, sourceSurfaceId, payload)
  pushEvent(sessionId, event)
  const session = store.sessions.get(sessionId)
  if (session) {
    session.updatedAt = now()
    store.sessions.set(sessionId, session)
  }
  return event
}

/** Reset all in-memory store state. For testing only. */
export function resetStore(): void {
  store.sessions.clear()
  store.events.clear()
  store.currentSessionId = null
  store.eventSequence = 0
}

// Helper to detect if a result is an error
export function isSessionError(v: unknown): v is SessionBridgeError {
  return typeof v === 'object' && v !== null && 'code' in v && 'message' in v
}

// Surface kind helpers
export function detectCurrentSurfaceKind(): SurfaceKind {
  if (typeof window === 'undefined') return 'unknown'
  if ('__TAURI__' in window) return 'mac-desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'mobile-ios'
  if (/android/.test(ua)) return 'mobile-android'
  if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa'
  return 'web'
}

export function surfaceKindLabel(kind: SurfaceKind): string {
  const labels: Record<SurfaceKind, string> = {
    'web': 'Browser',
    'pwa': 'PWA',
    'mac-desktop': 'Mac Desktop',
    'mobile-ios': 'iOS',
    'mobile-android': 'Android',
    'unknown': 'Unknown',
  }
  return labels[kind]
}
