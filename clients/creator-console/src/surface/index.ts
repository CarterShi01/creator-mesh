// Surface module — public API
// Import from here, not from individual files.

export type {
  SurfaceKind,
  SurfaceRole,
  SurfaceCapabilities,
  SurfaceInfo,
  SurfaceSafetyProfile,
} from './types'

export { NO_CAPABILITIES, defaultSafetyProfile } from './types'

export {
  detectSurface,
  detectSurfaceKind,
  detectCapabilities,
  surfaceLabel,
  isDesktopSurface,
  isMobileSurface,
  isPwaSurface,
  isStandaloneSurface,
} from './detector'

export { getAppVersion, getPlatformLabel, getDesktopCapabilities, isTauriBridgeAvailable } from './tauriBridge'
export { getCapacitorStatus, isCapacitorNative } from './capacitorBridge'
