// Session module — public API
// Import from here for session types, store, and client factory.

// Types
export type {
  SessionId,
  SurfaceId,
  SurfaceKind as SessionSurfaceKind,
  SurfaceRole as SessionSurfaceRole,
  SessionStatus,
  BridgeConnectionStatus,
  PairingCode,
  PairingState,
  ConnectedSurface,
  CreatorMeshSession,
  SessionEventType,
  SessionEvent,
  RemoteControlCommandType,
  RemoteControlCommand,
  SessionBridgeError,
  SessionBridgeErrorCode,
} from './types'

// SessionClient interface
export type { SessionClient, BridgeHealth } from './client'

// Store helpers
export {
  createSession,
  getSession,
  getCurrentSession,
  connectSurface,
  disconnectSurface,
  appendEvent,
  listEvents,
  updateSessionStatus,
  startPairing,
  completePairing,
  expirePairing,
  recordEvent,
  isSessionError,
} from './sessionStore'

// Bridge factory
export { getSessionBridge, getSessionClient, resetSessionBridge } from './mockSessionBridge'
