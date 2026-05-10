// Surface detector — identifies the current runtime environment.
//
// This is the single source of truth for "what surface am I?".
// Replaces: src/platform/platform.ts (PlatformKind) + session/sessionStore.ts (SurfaceKind)
//
// Usage:
//   import { detectSurface } from '../surface/detector'
//   const surface = detectSurface()

import type { SurfaceKind, SurfaceCapabilities, SurfaceInfo, SurfaceRole } from './types'
import { NO_CAPABILITIES } from './types'

// ─── Detection ────────────────────────────────────────────────────────────────

export function detectSurfaceKind(): SurfaceKind {
  if (typeof window === 'undefined') return 'unknown'

  // Tauri injects __TAURI__ into the window global
  if ('__TAURI__' in window) return 'tauri'

  // Capacitor injects Capacitor global
  if ('Capacitor' in window) return 'capacitor'

  // PWA standalone mode
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  ) {
    return 'pwa'
  }

  return 'web'
}

export function detectCapabilities(kind: SurfaceKind): SurfaceCapabilities {
  switch (kind) {
    case 'tauri':
      return {
        ...NO_CAPABILITIES,
        // Tauri has filesystem and local runner potential (Phase B+)
        // For now all disabled — not yet wired
        offlineCache: false, // Tauri app is bundled; no service worker needed
        clipboard: true,
      }
    case 'capacitor':
      return {
        ...NO_CAPABILITIES,
        pushNotifications: false, // requires plugin setup
        nativeShare: false,       // requires plugin setup
        qrScanner: false,         // requires plugin setup
        clipboard: true,
      }
    case 'pwa':
      return {
        ...NO_CAPABILITIES,
        offlineCache: true, // service worker registered
        clipboard: true,
      }
    case 'web':
      return {
        ...NO_CAPABILITIES,
        clipboard: true,
      }
    default:
      return { ...NO_CAPABILITIES }
  }
}

export function surfaceLabel(kind: SurfaceKind): string {
  const labels: Record<SurfaceKind, string> = {
    tauri: 'Mac Desktop',
    capacitor: 'Mobile App',
    pwa: 'PWA',
    web: 'Browser',
    unknown: 'Unknown',
  }
  return labels[kind]
}

/**
 * Detect the full SurfaceInfo for the current environment.
 * Role defaults to 'standalone' — the SessionBridge updates it when a session starts.
 */
export function detectSurface(role: SurfaceRole = 'standalone'): SurfaceInfo {
  const kind = detectSurfaceKind()
  return {
    kind,
    label: surfaceLabel(kind),
    role,
    capabilities: detectCapabilities(kind),
    bridgeReady: kind === 'tauri' || kind === 'capacitor',
  }
}

// ─── Convenience helpers (replaces platform.ts exports) ───────────────────────

export function isDesktopSurface(): boolean {
  return detectSurfaceKind() === 'tauri'
}

export function isMobileSurface(): boolean {
  return detectSurfaceKind() === 'capacitor'
}

export function isPwaSurface(): boolean {
  return detectSurfaceKind() === 'pwa'
}

export function isStandaloneSurface(): boolean {
  const k = detectSurfaceKind()
  return k === 'pwa' || k === 'tauri' || k === 'capacitor'
}
