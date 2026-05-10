// Backward-compatibility shim — Tauri bridge has moved to src/surface/tauriBridge.ts.
// New code should import from '../surface/tauriBridge' or '../surface'.

export {
  getAppVersion,
  getPlatformLabel,
  getDesktopCapabilities,
  isTauriBridgeAvailable,
} from '../surface/tauriBridge'
