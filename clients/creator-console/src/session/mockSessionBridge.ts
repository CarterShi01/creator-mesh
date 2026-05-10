// Mock SessionBridge — in-memory transport for CreatorMesh multi-surface architecture.
//
// No real networking. No WebSocket. No HTTP server.
// Commands are dispatched synchronously through WorkflowClient in-process.
// This is Phase A of the Remote Control architecture.
//
// Future phases:
//   Phase B: Mac desktop hosts a local HTTP API; bridge calls it via fetch/IPC
//   Phase C: LAN relay (optional)
//   Phase D: Cloud relay (optional)

import type { RuntimeClient } from '../runtime/client'
import type { SessionClient, BridgeHealth } from './client'
// WorkflowClient kept for backward compat — it's an alias of RuntimeClient
type WorkflowClient = RuntimeClient
import type {
  SessionId,
  SurfaceId,
  CreatorMeshSession,
  SessionEvent,
  ConnectedSurface,
  RemoteControlCommand,
  RemoteControlCommandType,
  PairingState,
  SurfaceKind,
  SessionBridgeError,
} from './types'
import {
  createSession,
  getCurrentSession,
  connectSurface,
  disconnectSurface as storeDisconnect,
  startPairing,
  completePairing,
  listEvents,
  recordEvent,
  updateSessionStatus,
} from './sessionStore'
import { detectSurfaceKind as detectEnvKind } from '../surface/detector'
import { getRuntimeClient } from '../runtime/workflowClient'

// Map surface/detector SurfaceKind → session SurfaceKind (session has legacy naming)
function toSessionSurfaceKind(kind: string): SurfaceKind {
  const map: Record<string, SurfaceKind> = {
    tauri: 'mac-desktop',
    capacitor: 'mobile-ios', // capacitor default; refined by UA if needed
    pwa: 'pwa',
    web: 'web',
    unknown: 'unknown',
  }
  return map[kind] ?? 'unknown'
}

function sessionSurfaceLabel(kind: SurfaceKind): string {
  const labels: Record<SurfaceKind, string> = {
    'web': 'Browser', 'pwa': 'PWA', 'mac-desktop': 'Mac Desktop',
    'mobile-ios': 'iOS', 'mobile-android': 'Android', 'unknown': 'Unknown',
  }
  return labels[kind] ?? 'Unknown'
}

// SessionBridge is kept as an alias for backward compat with existing components
export type { SessionClient as SessionBridge, BridgeHealth } from './client'

// ─── Mock Implementation ──────────────────────────────────────────────────────

type EventCallback = (event: SessionEvent) => void

class MockSessionBridge implements SessionClient {
  private workflowClient: WorkflowClient
  private subscribers: Set<EventCallback> = new Set()
  private hostSurfaceId: SurfaceId
  private controllerSurfaceCount = 0

  constructor() {
    this.workflowClient = null as unknown as WorkflowClient
    this.hostSurfaceId = `surface-host-${Date.now().toString(36)}`
    getRuntimeClient().then(client => { this.workflowClient = client })
  }

  /** Inject a pre-created WorkflowClient so bridge and App share the same RunLedger. */
  setWorkflowClient(client: WorkflowClient): void {
    this.workflowClient = client
  }

  getBridgeHealth(): BridgeHealth {
    const session = getCurrentSession()
    return {
      bridgeMode: 'mock',
      sessionActive: session !== null,
      connectedSurfaces: session?.surfaces.filter(s => s.connectionStatus === 'connected').length ?? 0,
      pairingActive: session?.pairing?.status === 'active' ? true : false,
      externalSideEffects: false,
      note: 'Mock-only bridge. No network access. No external side effects.',
    }
  }

  createHostSession(): CreatorMeshSession {
    const session = createSession()
    const kind = toSessionSurfaceKind(detectEnvKind())

    // Register the current surface as host
    connectSurface(session.sessionId, {
      surfaceId: this.hostSurfaceId,
      kind,
      role: 'host',
      connectionStatus: 'connected',
      label: kind === 'mac-desktop' ? 'Mac Desktop Host' : `${sessionSurfaceLabel(kind)} Host`,
    })

    this._notifySubscribers(session.sessionId)
    return getCurrentSession()!
  }

  getCurrentSession(): CreatorMeshSession | null {
    return getCurrentSession()
  }

  startPairing(): PairingState | SessionBridgeError {
    const session = getCurrentSession()
    if (!session) return { code: 'session.not_found', message: 'No active session. Create a host session first.' }

    const result = startPairing(session.sessionId)
    this._notifySubscribers(session.sessionId)
    return result
  }

  connectController(pairingCode: string, controllerLabel?: string): ConnectedSurface | SessionBridgeError {
    const session = getCurrentSession()
    if (!session) return { code: 'session.not_found', message: 'No active session' }

    this.controllerSurfaceCount += 1
    const controllerId = `surface-ctrl-${this.controllerSurfaceCount}-${Date.now().toString(36)}`

    // Detect controller surface kind (simulate mobile for preview)
    const envKind = detectEnvKind()
    const kind: SurfaceKind = envKind === 'tauri'
      ? 'web' // preview mode on desktop shows as "web controller"
      : toSessionSurfaceKind(envKind)

    const result = completePairing(session.sessionId, pairingCode, {
      surfaceId: controllerId,
      kind,
      role: 'controller',
      connectionStatus: 'pairing',
      label: controllerLabel ?? `${sessionSurfaceLabel(kind)} Controller`,
    })

    this._notifySubscribers(session.sessionId)
    return result
  }

  async sendCommand(
    cmd: Omit<RemoteControlCommand, 'commandId' | 'sentAt'>,
  ): Promise<{ ok: boolean; error?: string }> {
    const session = getCurrentSession()
    if (!session) return { ok: false, error: 'No active session' }

    const commandId = `cmd-${Date.now().toString(36)}`
    const type: RemoteControlCommandType = cmd.type

    recordEvent(
      session.sessionId,
      'remote.command_received',
      `Remote command received: ${type}`,
      cmd.sourceSurfaceId,
      { commandId, type, params: cmd.params },
    )

    try {
      if (type === 'start_run') {
        const inputText = cmd.params?.content ?? 'Remote mock thought via Session Bridge'
        const inputKind = cmd.params?.inputKind ?? 'thought'
        const response = await this.workflowClient.startRun({ inputKind, inputText, target: 'notion' })

        if (response.run) {
          updateSessionStatus(session.sessionId, 'active', response.run.runId)
          recordEvent(
            session.sessionId,
            'run.started',
            `Run started: ${response.run.runId}`,
            cmd.sourceSurfaceId,
            { runId: response.run.runId },
          )
        }
        this._notifySubscribers(session.sessionId)
        return { ok: true }
      }

      if (['accept_review', 'reject_review', 'request_changes', 'cancel_run'].includes(type)) {
        const runId = session.activeRunId
        if (!runId) return { ok: false, error: 'No active run to act on' }

        if (type === 'cancel_run') {
          await this.workflowClient.cancelRun(runId)
          updateSessionStatus(session.sessionId, 'cancelled', null)
          recordEvent(session.sessionId, 'run.cancelled', 'Run cancelled via remote command', cmd.sourceSurfaceId)
          this._notifySubscribers(session.sessionId)
          return { ok: true }
        }

        const decisionMap: Record<string, 'accepted' | 'rejected' | 'changes_requested'> = {
          accept_review: 'accepted',
          reject_review: 'rejected',
          request_changes: 'changes_requested',
        }
        const decision = decisionMap[type]
        const feedback = cmd.params?.feedback ?? cmd.params?.note

        await this.workflowClient.resumeRun(runId, { decision, feedback })

        const evtType =
          decision === 'accepted' ? 'human.accepted'
          : decision === 'rejected' ? 'human.rejected'
          : 'human.changes_requested'

        recordEvent(
          session.sessionId,
          evtType,
          `Human decision: ${decision}${feedback ? ` — ${feedback}` : ''}`,
          cmd.sourceSurfaceId,
        )

        const statusMap: Record<string, import('./types').SessionStatus> = {
          accepted: 'active',
          rejected: 'idle',
          changes_requested: 'idle',
        }
        updateSessionStatus(session.sessionId, statusMap[decision], decision === 'accepted' ? runId : null)
        this._notifySubscribers(session.sessionId)
        return { ok: true }
      }

      return { ok: false, error: `Unknown command type: ${type}` }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  subscribeToEvents(callback: EventCallback): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  disconnectSurface(surfaceId: SurfaceId): void {
    const session = getCurrentSession()
    if (!session) return
    storeDisconnect(session.sessionId, surfaceId)
    this._notifySubscribers(session.sessionId)
  }

  listEvents(): SessionEvent[] {
    const session = getCurrentSession()
    if (!session) return []
    return listEvents(session.sessionId)
  }

  // Notify all subscribers of latest events
  private _notifySubscribers(sessionId: SessionId): void {
    const events = listEvents(sessionId)
    const latest = events[events.length - 1]
    if (latest) {
      this.subscribers.forEach(cb => cb(latest))
    }
  }

  /** Expose workflowClient so UI can also read run state directly */
  getWorkflowClient(): WorkflowClient {
    return this.workflowClient
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

// Single shared bridge instance for the app session
let _bridge: MockSessionBridge | null = null

export function getSessionBridge(): MockSessionBridge {
  if (!_bridge) {
    _bridge = new MockSessionBridge()
  }
  return _bridge
}

/** Preferred alias — returns the SessionClient interface. */
export function getSessionClient(): SessionClient {
  return getSessionBridge()
}

export function resetSessionBridge(): void {
  _bridge = null
}
