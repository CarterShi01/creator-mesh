import { useState, useEffect, useCallback } from 'react'
import { getSessionBridge } from '../../session/mockSessionBridge'
import type { ConnectedSurface } from '../../session/types'

export function ConnectedSurfacesPanel() {
  const [surfaces, setSurfaces] = useState<ConnectedSurface[]>([])
  const bridge = getSessionBridge()

  const refresh = useCallback(() => {
    const session = bridge.getCurrentSession()
    setSurfaces(session?.surfaces ?? [])
  }, [bridge])

  useEffect(() => {
    refresh()
    const unsub = bridge.subscribeToEvents(() => refresh())
    return unsub
  }, [bridge, refresh])

  return (
    <section className="panel connected-surfaces-panel">
      <h2 className="panel-title">Connected Surfaces ({surfaces.filter(s => s.connectionStatus === 'connected').length})</h2>
      {surfaces.length === 0 && (
        <p className="empty-state-small">No surfaces. Create a host session to see connected devices.</p>
      )}
      {surfaces.map(s => (
        <div key={s.surfaceId} className="surface-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
          <span className="surface-icon">{surfaceIcon(s.kind)}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>{s.label}</div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
              last seen {formatTime(s.lastSeenAt)}
            </div>
          </div>
          <span className={`badge badge-${s.role === 'host' ? 'info' : 'success'}`}>{s.role}</span>
          <span className={`badge badge-${connectionColor(s.connectionStatus)}`}>{s.connectionStatus}</span>
        </div>
      ))}
    </section>
  )
}

function surfaceIcon(kind: string): string {
  const icons: Record<string, string> = {
    'web': '🌐', 'pwa': '📲', 'mac-desktop': '🖥',
    'mobile-ios': '📱', 'mobile-android': '📱', 'unknown': '❓',
  }
  return icons[kind] ?? '❓'
}

function connectionColor(status: string): string {
  const map: Record<string, string> = {
    connected: 'success', disconnected: 'secondary',
    pairing: 'warning', reconnecting: 'warning', expired: 'danger',
  }
  return map[status] ?? 'secondary'
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}
