import { useState, useEffect, useCallback } from 'react'
import { getSessionBridge } from '../../session/mockSessionBridge'
import type { CreatorMeshSession } from '../../session/types'
import { detectCurrentSurfaceKind } from '../../session/sessionStore'

export function MobileRemotePanel() {
  const [session, setSession] = useState<CreatorMeshSession | null>(null)
  const [pairingInput, setPairingInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [sendingCommand, setSendingCommand] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bridge = getSessionBridge()
  const surfaceKind = detectCurrentSurfaceKind()
  const isMobile = surfaceKind === 'mobile-ios' || surfaceKind === 'mobile-android'
  const label = isMobile ? '📱 Mobile Remote Control' : '📱 Remote Control Preview'

  const controllerSurfaceId = `ctrl-preview-${typeof window !== 'undefined' ? (window as Window & { _ctrlId?: string })._ctrlId ?? ((window as Window & { _ctrlId?: string })._ctrlId = Date.now().toString(36)) : 'ssr'}`

  const refresh = useCallback(() => {
    setSession(bridge.getCurrentSession())
  }, [bridge])

  useEffect(() => {
    refresh()
    const unsub = bridge.subscribeToEvents(() => refresh())
    return unsub
  }, [bridge, refresh])

  async function handleConnect() {
    setError(null)
    setConnecting(true)
    const code = pairingInput.trim().toUpperCase()
    if (code.length < 4) {
      setError('Enter the pairing code shown on the host.')
      setConnecting(false)
      return
    }
    const result = bridge.connectController(code, isMobile ? 'Mobile Controller' : 'Browser Controller Preview')
    if ('code' in result && 'message' in result) {
      setError((result as { message: string }).message)
    } else {
      setPairingInput('')
      setLastResult('Connected to host session.')
    }
    refresh()
    setConnecting(false)
  }

  async function sendCmd(
    type: 'start_run' | 'accept_review' | 'reject_review' | 'request_changes' | 'cancel_run',
    params?: Record<string, string>,
  ) {
    setError(null)
    setLastResult(null)
    setSendingCommand(true)
    const result = await bridge.sendCommand({
      type,
      sourceSurfaceId: controllerSurfaceId,
      sessionId: session?.sessionId ?? '',
      params,
    })
    if (result.ok) {
      setLastResult(`Command sent: ${type}`)
    } else {
      setError(result.error ?? 'Command failed')
    }
    refresh()
    setSendingCommand(false)
  }

  const activeRun = session?.activeRunId ?? null
  const sessionStatus = session?.status ?? 'idle'
  const isPaused = sessionStatus === 'paused'
  const isRunning = sessionStatus === 'active'
  const connectedToHost = session?.surfaces.some(s => s.role === 'host' && s.connectionStatus === 'connected')

  return (
    <section className="panel mobile-remote-panel">
      <h2 className="panel-title">
        {label}
        <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
          MOCK
        </span>
      </h2>

      <p className="safety-note">
        Remote Control Preview — commands are dispatched in-process. No real networking.
        No shell execution. No external side effects.
      </p>

      {/* Connection */}
      <div className="host-section">
        <h3 className="section-subtitle">Connect to Host</h3>
        {!session && (
          <p className="empty-state-small">No host session found. Create one from the Desktop Host panel first.</p>
        )}
        {session && !connectedToHost && (
          <p className="empty-state-small">Host session found. Enter pairing code to connect as controller.</p>
        )}
        {session && (
          <div className="pairing-input-row">
            <input
              className="pairing-input"
              type="text"
              maxLength={6}
              placeholder="CODE"
              value={pairingInput}
              onChange={e => setPairingInput(e.target.value.toUpperCase())}
              aria-label="Pairing code"
            />
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={connecting || !pairingInput.trim()}
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        )}
      </div>

      {/* Status */}
      {session && (
        <div className="host-section">
          <h3 className="section-subtitle">Session Status</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Host Status</span>
              <span className={`badge badge-${sessionStatusColor(sessionStatus)}`}>{sessionStatus}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Active Run</span>
              <span className="info-value mono">{activeRun ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Remote Actions */}
      {session && (
        <div className="host-section">
          <h3 className="section-subtitle">Remote Control Actions</h3>
          <div className="remote-actions">
            <div className="remote-action-row">
              <button
                className="btn btn-primary"
                disabled={sendingCommand || isRunning}
                onClick={() => sendCmd('start_run', { content: 'Remote mock workflow trigger', inputKind: 'thought' })}
              >
                ▶ Start Mock Workflow
              </button>
              <button
                className="btn btn-ghost"
                disabled={sendingCommand || !activeRun}
                onClick={() => sendCmd('cancel_run')}
              >
                ✕ Cancel Run
              </button>
            </div>
            <div className="remote-action-row">
              <button
                className="btn btn-success"
                disabled={sendingCommand || !isPaused}
                onClick={() => sendCmd('accept_review')}
              >
                ✓ Accept Review
              </button>
              <button
                className="btn btn-danger"
                disabled={sendingCommand || !isPaused}
                onClick={() => sendCmd('reject_review', { feedback: 'Rejected via remote' })}
              >
                ✗ Reject
              </button>
              <button
                className="btn btn-warning"
                disabled={sendingCommand || !isPaused}
                onClick={() => sendCmd('request_changes', { feedback: 'Changes requested via remote' })}
              >
                ⟳ Request Changes
              </button>
            </div>
          </div>

          {!isPaused && !isRunning && (
            <p className="empty-state-small" style={{ marginTop: '6px' }}>
              Review actions are enabled only when a run is paused for human review.
            </p>
          )}
        </div>
      )}

      {lastResult && <p style={{ fontSize: '11px', color: 'var(--color-accent)', margin: 0 }}>{lastResult}</p>}
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
