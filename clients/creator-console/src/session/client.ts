// SessionClient — the pure interface contract for multi-surface session coordination.
//
// This file contains ONLY the interface. No implementation. No factory.
//
// Architecture:
//   UI → SessionClient interface → implementation (mock | local-lan | cloud-relay)
//
// Implementations:
//   mock      → session/mockSessionBridge.ts   (current — in-process, no networking)
//   local-lan → session/lanBridge.ts           (Phase C — LAN pairing via Tauri HTTP server)
//   relay     → session/relayBridge.ts         (Phase D — secure cloud relay)
//
// Relationship to RuntimeClient:
//   SessionClient coordinates WHICH surface is doing WHAT.
//   RuntimeClient executes the actual workflow.
//   Commands flow: Controller → SessionClient.sendCommand → RuntimeClient.startRun / resumeRun
//   All commands are subject to GovernanceEvaluator on the host side.

import type { CreatorMeshSession, SessionEvent, ConnectedSurface, PairingState, SessionBridgeError, RemoteControlCommand, SurfaceId } from './types'

export interface BridgeHealth {
  bridgeMode: 'mock' | 'local-lan' | 'cloud-relay'
  sessionActive: boolean
  connectedSurfaces: number
  pairingActive: boolean
  externalSideEffects: false
  note: string
}

export interface SessionClient {
  /** Current health of the session bridge. */
  getBridgeHealth(): BridgeHealth

  /** Create and register a host session. Returns the new session. */
  createHostSession(): CreatorMeshSession

  /** Get the current session, if any. */
  getCurrentSession(): CreatorMeshSession | null

  /**
   * Start pairing — generate a short-lived code a controller can use to join.
   * Returns the PairingState (including code) or an error.
   */
  startPairing(): PairingState | SessionBridgeError

  /**
   * A controller surface calls this to join the session using the pairing code.
   * Returns the ConnectedSurface record or an error.
   */
  connectController(pairingCode: string, controllerLabel?: string): ConnectedSurface | SessionBridgeError

  /**
   * Send a remote control command from a controller to the host.
   * The host evaluates the command against GovernanceEvaluator before executing.
   */
  sendCommand(command: Omit<RemoteControlCommand, 'commandId' | 'sentAt'>): Promise<{ ok: boolean; error?: string }>

  /** Subscribe to session events. Returns an unsubscribe function. */
  subscribeToEvents(callback: (event: SessionEvent) => void): () => void

  /** Disconnect a surface from the session. */
  disconnectSurface(surfaceId: SurfaceId): void

  /** List all events for the current session. */
  listEvents(): SessionEvent[]
}
