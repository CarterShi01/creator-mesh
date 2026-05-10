import { usePwa } from '../hooks/usePwa'

export function PwaStatus() {
  const { isStandalone, isOfflineReady, updateAvailable } = usePwa()

  return (
    <div className="pwa-status" title="App mode and offline status">
      <span className={`pwa-badge ${isStandalone ? 'pwa-badge--standalone' : 'pwa-badge--browser'}`}>
        {isStandalone ? 'App' : 'Browser'}
      </span>
      {isOfflineReady && (
        <span className="pwa-badge pwa-badge--offline-ready" title="Offline shell ready">
          Offline ✓
        </span>
      )}
      {updateAvailable && (
        <span
          className="pwa-badge pwa-badge--update"
          title="New version available — reload to update"
          onClick={() => window.location.reload()}
          style={{ cursor: 'pointer' }}
        >
          Update ↻
        </span>
      )}
    </div>
  )
}
