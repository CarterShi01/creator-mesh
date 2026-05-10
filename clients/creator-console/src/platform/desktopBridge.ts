import { isDesktopShell } from './platform'

// Safe no-op bridge. All methods are read-only and side-effect-free.
// Tauri commands are invoked via window.__TAURI__.core.invoke when available.
// In web/PWA mode, returns safe mock values.

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>

function getTauriInvoke(): TauriInvoke | null {
  try {
    // Tauri v2 exposes __TAURI__.core.invoke on window
    const tauri = (window as Window & { __TAURI__?: { core?: { invoke?: TauriInvoke } } }).__TAURI__
    return tauri?.core?.invoke ?? null
  } catch {
    return null
  }
}

export async function getAppVersion(): Promise<string> {
  if (isDesktopShell()) {
    const invoke = getTauriInvoke()
    if (invoke) {
      try { return await invoke<string>('get_app_version') } catch { /* fall through */ }
    }
    return '0.1.0-desktop'
  }
  return '0.1.0-web'
}

export async function getLocalRunnerStatus(): Promise<'unavailable' | 'stopped' | 'running'> {
  return 'unavailable'
}

export async function openAppDataFolder(): Promise<void> {
  // Intentionally no-op in Phase 2/3 — requires explicit Tauri fs plugin + user permission
}

export async function getPlatformLabel(): Promise<string> {
  if (isDesktopShell()) {
    const invoke = getTauriInvoke()
    if (invoke) {
      try { return await invoke<string>('get_platform_label') } catch { /* fall through */ }
    }
    return 'macOS Desktop'
  }
  return 'Web'
}

export async function getDesktopCapabilities(): Promise<Record<string, boolean>> {
  if (isDesktopShell()) {
    const invoke = getTauriInvoke()
    if (invoke) {
      try { return await invoke<Record<string, boolean>>('get_desktop_capabilities') } catch { /* fall through */ }
    }
    return { localShell: false, filesystem: false, governedWorkflowApi: false }
  }
  return { localShell: false, filesystem: false, governedWorkflowApi: false }
}
