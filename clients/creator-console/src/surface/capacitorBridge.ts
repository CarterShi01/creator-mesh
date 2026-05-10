// Capacitor surface bridge — stub for future iOS/Android native capabilities.
//
// All methods are safe no-ops until Capacitor plugins are installed and configured.
// Install: npm install @capacitor/core @capacitor/cli && npx cap init
//
// Future plugins to add:
//   @capacitor/push-notifications  — for review prompt notifications
//   @capacitor/share               — for native share sheet
//   @capacitor/clipboard           — for clipboard access
//   @capacitor-community/barcode-scanner — for QR pairing

export interface CapacitorBridgeStatus {
  available: boolean
  platform: 'ios' | 'android' | 'web' | 'unknown'
}

export function getCapacitorStatus(): CapacitorBridgeStatus {
  if (typeof window === 'undefined' || !('Capacitor' in window)) {
    return { available: false, platform: 'unknown' }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor
  return {
    available: true,
    platform: cap?.getPlatform?.() ?? 'unknown',
  }
}

/** Stub: request push notification permission. Returns false until plugin is installed. */
export async function requestPushPermission(): Promise<boolean> {
  return false
}

/** Stub: share content via OS share sheet. No-op until @capacitor/share is installed. */
export async function shareContent(_title: string, _text: string): Promise<void> {
  // no-op
}

/** True when running inside a real Capacitor shell (not browser emulation). */
export function isCapacitorNative(): boolean {
  return getCapacitorStatus().available
}
