// Session Bridge domain types for CreatorMesh multi-surface architecture.
//
// Architecture map (future):
//   Mac Desktop App  →  Runtime Host  →  LocalWorkflowRunner → Orchestrator → Connectors
//   Mobile App       →  Remote Controller  →  sends commands to Host via Bridge
//   Web/PWA          →  General control surface
//
// Current state: all in-memory mock. No real networking.

// ─── Identifiers ─────────────────────────────────────────────────────────────

export type SessionId = string
export type SurfaceId = string

// ─── Enumerations ────────────────────────────────────────────────────────────

/** The kind of surface connected to a session. */
export type SurfaceKind =
  | 'web'            // Browser tab
  | 'pwa'            // Installed PWA
  | 'mac-desktop'    // Tauri macOS shell — future: local Runtime Host
  | 'mobile-ios'     // Capacitor iOS shell — future: Remote Controller
  | 'mobile-android' // Capacitor Android shell — future: Remote Controller
  | 'unknown'

/**
 * The role a surface plays in the session.
 *
 * host: owns the runtime and executes workflows (Mac desktop, Phase B+)
 * controller: sends commands to the host (mobile, web)
 * observer: watches session state without sending commands
 */
export type SurfaceRole = 'host' | 'controller' | 'observer'

/** Lifecycle of a CreatorMesh session. */
export type SessionStatus =
  | 'idle'
  | 'active'
  | 'paused'       // run is at HumanReviewStep
  | 'completed'
  | 'cancelled'
  | 'disconnected'

/** Connection status of the bridge between surfaces. */
export type BridgeConnectionStatus =
  | 'disconnected'
  | 'pairing'
  | 'connected'
  | 'reconnecting'
  | 'expired'

// ─── Pairing ─────────────────────────────────────────────────────────────────

/** Short alphanumeric code displayed on the host for controller pairing. */
export type PairingCode = string

export interface PairingState {
  code: PairingCode
  startedAt: string
  expiresAt: string
  /** How long the code is valid in milliseconds. Default: 5 minutes. */
  ttlMs: number
  status: 'active' | 'completed' | 'expired'
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

export interface ConnectedSurface {
  surfaceId: SurfaceId
  kind: SurfaceKind
  role: SurfaceRole
  connectionStatus: BridgeConnectionStatus
  connectedAt: string
  lastSeenAt: string
  label: string
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface CreatorMeshSession {
  sessionId: SessionId
  status: SessionStatus
  createdAt: string
  updatedAt: string
  surfaces: ConnectedSurface[]
  pairing: PairingState | null
  /** ID of the current active run if any */
  activeRunId: string | null
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type SessionEventType =
  | 'session.created'
  | 'surface.connected'
  | 'surface.disconnected'
  | 'run.started'
  | 'run.paused_for_review'
  | 'human.accepted'
  | 'human.rejected'
  | 'human.changes_requested'
  | 'run.completed'
  | 'run.cancelled'
  | 'governance.decision_added'
  | 'bridge.pairing_started'
  | 'bridge.pairing_expired'
  | 'bridge.pairing_completed'
  | 'remote.command_received'

export interface SessionEvent {
  eventId: string
  sessionId: SessionId
  type: SessionEventType
  /** The surface that originated this event */
  sourceSurfaceId: SurfaceId | null
  timestamp: string
  message: string
  /** Optional structured payload */
  payload?: Record<string, unknown>
}

// ─── Remote Control Commands ─────────────────────────────────────────────────

/**
 * Commands a controller surface can send to the host.
 *
 * All commands are subject to governance evaluation on the host side.
 * Controllers cannot bypass governance — they only request actions.
 */
export type RemoteControlCommandType =
  | 'start_run'
  | 'accept_review'
  | 'reject_review'
  | 'request_changes'
  | 'cancel_run'

export interface RemoteControlCommand {
  commandId: string
  type: RemoteControlCommandType
  sourceSurfaceId: SurfaceId
  sessionId: SessionId
  sentAt: string
  /** Command-specific parameters */
  params?: {
    /** For start_run */
    inputKind?: 'thought' | 'message'
    content?: string
    /** For reject_review / request_changes */
    feedback?: string
    /** For accept_review */
    note?: string
    /** For cancel_run */
    reason?: string
  }
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export type SessionBridgeErrorCode =
  | 'session.not_found'
  | 'session.already_exists'
  | 'surface.not_found'
  | 'pairing.expired'
  | 'pairing.invalid_code'
  | 'pairing.already_active'
  | 'command.invalid'
  | 'command.run_not_active'
  | 'command.governance_denied'
  | 'bridge.not_connected'

export interface SessionBridgeError {
  code: SessionBridgeErrorCode
  message: string
}
