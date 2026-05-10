import { useState, useEffect } from 'react'
import { isDesktopShell } from '../platform/platform'
import { getAppVersion, getPlatformLabel, getDesktopCapabilities } from '../platform/desktopBridge'

interface DesktopInfo {
  version: string
  platform: string
  capabilities: Record<string, boolean>
}

export function DesktopStatus() {
  const [info, setInfo] = useState<DesktopInfo | null>(null)

  useEffect(() => {
    if (!isDesktopShell()) return

    Promise.all([
      getAppVersion(),
      getPlatformLabel(),
      getDesktopCapabilities(),
    ]).then(([version, platform, capabilities]) => {
      setInfo({ version, platform, capabilities })
    })
  }, [])

  if (!isDesktopShell() || !info) return null

  return (
    <div className="desktop-status panel">
      <div className="panel-header">
        <span className="panel-title">Desktop Shell</span>
        <span className="badge badge-desktop">Native</span>
      </div>
      <div className="desktop-status-rows">
        <div className="desktop-status-row">
          <span className="desktop-status-label">Version</span>
          <span className="desktop-status-value">{info.version}</span>
        </div>
        <div className="desktop-status-row">
          <span className="desktop-status-label">Platform</span>
          <span className="desktop-status-value">{info.platform}</span>
        </div>
        <div className="desktop-status-row desktop-status-row--caps">
          <span className="desktop-status-label">Capabilities</span>
          <div className="desktop-status-caps">
            {Object.entries(info.capabilities).map(([key, enabled]) => (
              <span
                key={key}
                className={`desktop-cap ${enabled ? 'desktop-cap--on' : key === 'governedWorkflowApi' ? 'desktop-cap--future' : 'desktop-cap--off'}`}
              >
                {key}: {enabled ? 'enabled' : key === 'governedWorkflowApi' ? 'future' : 'disabled'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
