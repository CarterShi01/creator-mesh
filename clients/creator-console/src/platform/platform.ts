export type PlatformKind = 'web' | 'pwa' | 'tauri' | 'unknown'

export interface PlatformInfo {
  kind: PlatformKind
  label: string
  isDesktop: boolean
  isPwa: boolean
  isTauri: boolean
}

function detectKind(): PlatformKind {
  // Tauri injects __TAURI__ into the window
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    return 'tauri'
  }
  if (
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  ) {
    return 'pwa'
  }
  if (typeof window !== 'undefined') {
    return 'web'
  }
  return 'unknown'
}

export function getPlatformInfo(): PlatformInfo {
  const kind = detectKind()
  return {
    kind,
    label:
      kind === 'tauri'
        ? 'Desktop Shell'
        : kind === 'pwa'
          ? 'PWA'
          : kind === 'web'
            ? 'Browser'
            : 'Unknown',
    isDesktop: kind === 'tauri',
    isPwa: kind === 'pwa',
    isTauri: kind === 'tauri',
  }
}

export function isDesktopShell(): boolean {
  return detectKind() === 'tauri'
}

export function isPwaStandalone(): boolean {
  const k = detectKind()
  return k === 'pwa' || k === 'tauri'
}
