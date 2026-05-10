// Backward-compatibility shim — platform detection has moved to src/surface/.
// New code should import from '../surface/detector' or '../surface'.

import {
  detectSurface,
  detectSurfaceKind,
  isDesktopSurface,
  isPwaSurface,
  isStandaloneSurface,
} from '../surface/detector'

// PlatformKind kept for backward compat
export type PlatformKind = 'web' | 'pwa' | 'tauri' | 'unknown'

export interface PlatformInfo {
  kind: PlatformKind
  label: string
  isDesktop: boolean
  isPwa: boolean
  isTauri: boolean
}

export function getPlatformInfo(): PlatformInfo {
  const surface = detectSurface()
  return {
    kind: surface.kind as PlatformKind,
    label: surface.label,
    isDesktop: surface.kind === 'tauri',
    isPwa: surface.kind === 'pwa',
    isTauri: surface.kind === 'tauri',
  }
}

export function isDesktopShell(): boolean { return isDesktopSurface() }
export function isPwaStandalone(): boolean { return isPwaSurface() || isStandaloneSurface() }

export { detectSurfaceKind as detectKind }
