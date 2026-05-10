import { useState, useEffect, useCallback } from 'react'
import { getSessionBridge } from '../../session/mockSessionBridge'
import type { CreatorMeshSession, PairingState } from '../../session/types'
import { isDesktopShell } from '../../platform/platform'

export function DesktopHostPanel() {
  const [session, setSession] = useState<CreatorMeshSession | null>(null)
  const [pairing, setPairing] = useState<PairingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bridge = getSessionBridge()
  const isDesktop = isDesktopShell()

  const refresh = useCallback(() => {
    const s = bridge.getCurrentSession()
    setSession(s)
    setPairing(s?.pairing?.status === 'active' ? s.pairing : null)
  }, [bridge])

  useEffect(() => {
    refresh()
    const unsub = bridge.subscribeToEvents(() => refresh())
    return unsub
  }, [bridge, refresh])

  function handleCreateSession() {
    setError(null)
    bridge.createHostSession()
    refresh()
  }

  function handleStartPairing() {
    setError(null)
    const result = bridge.startPairing()
    if ('code' in result && 'message' in result) {
      setError((result as { message: string }).message)
    } else if (!('code' in result)) {
      setPairing(result as PairingState)
    }
    refresh()
  }

  function handleExpirePairing() {
    if (!session) return
    const health = bridge.getBridgeHealth()
    if (!health.pairingActive) return
    // Use sessionStore directly via bridge session
    import('../../session/sessionStore').then(({ expirePairing }) => {
      expirePairing(session.sessionId)
      refresh()
    })
  }

  const health = bridge.getBridgeHealth()
  const connectedSurfaces = session?.surfaces.filter(s => s.connectionStatus === 'connected') ?? []

  return (
    <section className="panel desktop-host-panel">
      <h2 className="panel-title">
        {isDesktop ? '🖥 Mac Desktop Host' : '🖥 Desktop Host Preview'}
        <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
          {health.bridgeMode.toUpperCase()}
        </span>
      </h2>

      <p className="safety-note">
        This host mode is local/mock only. It does not expose network access or execute local commands.
      </p>

      {!session && (
        <div className="host-actions">
          <button className="btn btn-primary" onClick={handleCreateSession}>
            Create Host Session
          </button>
        </div>
      )}

      {session && (
        <>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Session ID</span>
              <span className="info-value mono">{session.sessionId}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className={`badge badge-${sessionStatusColor(session.status)}`}>{session.status}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Active Run</span>
              <span className="info-value mono">{session.activeRunId ?? '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Runtime Health</span>
              <span className="badge badge-success">mock-only</span>
            </div>
            <div className="info-row">
              <span className="info-label">External Side Effects</span>
              <span className="badge badge-warning">disabled</span>
            </div>
            <div className="info-row">
              <span className="info-label">Local Runner</span>
              <span className="badge badge-warning">not connected</span>
            </div>
          </div>

          <div className="host-section">
            <h3 className="section-subtitle">Pairing</h3>
            {pairing && (
              <div className="pairing-code-display">
                <span className="pairing-label">Code:</span>
                <span className="pairing-code">{pairing.code}</span>
                <span className="pairing-expires">
                  expires {new Date(pairing.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            )}
            {!pairing && (
              <p className="empty-state-small">No active pairing. Start pairing to let a controller connect.</p>
            )}
            <div className="host-actions">
              {!pairing && (
                <button className="btn btn-primary" onClick={handleStartPairing}>
                  Start Pairing
                </button>
              )}
              {pairing && (
                <button className="btn btn-ghost" onClick={handleExpirePairing}>
                  Cancel Pairing
                </button>
              )}
            </div>
          </div>

          <div className="host-section">
            <h3 className="section-subtitle">Connected Surfaces ({connectedSurfaces.length})</h3>
            {connectedSurfaces.length === 0 && (
              <p className="empty-state-small">No surfaces connected yet.</p>
            )}
            {connectedSurfaces.map(s => (
              <div key={s.surfaceId} className="surface-row">
                <span className="surface-icon">{surfaceIcon(s.kind)}</span>
                <span className="surface-label">{s.label}</span>
                <span className={`badge badge-${s.role === 'host' ? 'info' : 'success'}`}>{s.role}</span>
                <span className="badge badge-success">{s.connectionStatus}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="error-note">{error}</p>}
    </section>
  )
}

function sessionStatusColor(status: string): string {
  const map: Record<string, string> = {
    idle: 'secondary',
    active: 'success',
    paused: 'warning',
    completed: 'info',
    cancelled: 'secondary',
    disconnected: 'danger',
  }
  return map[status] ?? 'secondary'
}

function surfaceIcon(kind: string): string {
  const icons: Record<string, string> = {
    'web': '🌐',
    'pwa': '📱',
    'mac-desktop': '🖥',
    'mobile-ios': '📱',
    'mobile-android': '📱',
    'unknown': '❓',
  }
  return icons[kind] ?? '❓'
}
