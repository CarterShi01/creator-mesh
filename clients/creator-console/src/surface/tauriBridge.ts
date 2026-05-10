// Tauri surface bridge — safe read-only native commands for the macOS desktop surface.
//
// All methods degrade gracefully when not running inside Tauri.
// No write operations. No filesystem access. No subprocess execution.
//
// Replaces: src/platform/desktopBridge.ts (same contract, new location)

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

function getInvoke(): TauriInvoke | null {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__TAURI__?.core?.invoke ?? null
  }
  return null
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  const fn = getInvoke()
  if (!fn) return null
  try {
    return (await fn(cmd, args)) as T
  } catch {
    return null
  }
}

/** Returns the app version from Cargo.toml. Returns null outside Tauri. */
export async function getAppVersion(): Promise<string | null> {
  return invoke<string>('get_app_version')
}

/** Returns the OS platform label from the Tauri backend. */
export async function getPlatformLabel(): Promise<string | null> {
  return invoke<string>('get_platform_label')
}

export interface DesktopCapabilities {
  localShellEnabled: boolean
  fileSystemEnabled: boolean
  governedWorkflowApiReady: boolean
}

/** Returns capability flags from the Tauri backend (all false until wired in Phase B). */
export async function getDesktopCapabilities(): Promise<DesktopCapabilities> {
  const result = await invoke<DesktopCapabilities>('get_desktop_capabilities')
  return result ?? {
    localShellEnabled: false,
    fileSystemEnabled: false,
    governedWorkflowApiReady: false,
  }
}

/** True when the Tauri bridge is available. */
export function isTauriBridgeAvailable(): boolean {
  return getInvoke() !== null
}
