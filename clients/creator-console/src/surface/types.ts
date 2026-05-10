// Unified Surface model for CreatorMesh Console.
//
// A "surface" is one runtime environment where the CreatorMesh UI can render.
// All surfaces share the same React component tree and WorkflowClient interface.
// Each surface may have different native capabilities exposed through a bridge.
//
// Architecture:
//   Shared UI (React)
//     → SurfaceInfo       (what surface am I?)
//     → SurfaceCapability (what can I do natively?)
//     → SurfaceBridge     (how do I call native features?)
//     → RuntimeClient     (how do I run workflows?)
//     → SessionBridge     (how do I connect to other surfaces?)

// ─── Surface Identity ────────────────────────────────────────────────────────

/**
 * The environment where this UI instance is running.
 *
 * web          — standard browser tab (http/https)
 * pwa          — installed PWA in standalone display mode
 * tauri        — wrapped in Tauri macOS/Windows desktop shell
 * capacitor    — wrapped in Capacitor iOS/Android shell
 * unknown      — cannot be determined (SSR, test, etc.)
 */
export type SurfaceKind =
  | 'web'
  | 'pwa'
  | 'tauri'
  | 'capacitor'
  | 'unknown'

/**
 * The role this surface plays in a multi-surface session.
 *
 * standalone   — no session bridge active; operates independently
 * host         — hosts the Runtime and accepts remote commands (Mac desktop, Phase B+)
 * controller   — sends commands to a host (mobile, web remote)
 * observer     — watches session state; sends no commands
 */
export type SurfaceRole = 'standalone' | 'host' | 'controller' | 'observer'

// ─── Surface Capabilities ─────────────────────────────────────────────────────

/**
 * Native capabilities available on this surface.
 * All default to false. Each surface bridge enables the ones it supports.
 *
 * localRunner      — can spawn LocalWorkflowRunner subprocess (Tauri, Phase B+)
 * fileSystem       — can read/write local files (Tauri with fs plugin)
 * pushNotifications— can receive push notifications (Capacitor)
 * nativeShare      — can use OS share sheet (Capacitor)
 * qrScanner        — can scan QR codes (Capacitor)
 * clipboard        — can access clipboard (all, with user permission)
 * offlineCache     — has service worker / offline support (PWA, Tauri)
 */
export interface SurfaceCapabilities {
  localRunner: boolean
  fileSystem: boolean
  pushNotifications: boolean
  nativeShare: boolean
  qrScanner: boolean
  clipboard: boolean
  offlineCache: boolean
}

export const NO_CAPABILITIES: SurfaceCapabilities = {
  localRunner: false,
  fileSystem: false,
  pushNotifications: false,
  nativeShare: false,
  qrScanner: false,
  clipboard: false,
  offlineCache: false,
}

// ─── Surface Info ─────────────────────────────────────────────────────────────

/** Complete description of the current surface. */
export interface SurfaceInfo {
  kind: SurfaceKind
  /** Human-readable label for display in UI */
  label: string
  /** The role this surface is playing in the current session */
  role: SurfaceRole
  /** What this surface can do natively */
  capabilities: SurfaceCapabilities
  /** True when native bridge is available and initialized */
  bridgeReady: boolean
}

// ─── Surface Safety ──────────────────────────────────────────────────────────

/**
 * Safety constraints for this surface.
 * No surface bypasses governance — these are additional display-layer guards.
 */
export interface SurfaceSafetyProfile {
  /** Can start a workflow run */
  canStartRun: boolean
  /** Can send remote control commands */
  canSendCommands: boolean
  /** Can execute local runners (requires host role + localRunner capability) */
  canExecuteLocally: boolean
  /** Human-readable safety summary for display */
  safetyLabel: 'mock-only' | 'governed-local' | 'governed-remote' | 'read-only'
}

export function defaultSafetyProfile(): SurfaceSafetyProfile {
  return {
    canStartRun: true,
    canSendCommands: true,
    canExecuteLocally: false,
    safetyLabel: 'mock-only',
  }
}
