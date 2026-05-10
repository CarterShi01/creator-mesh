import type { RuntimeHealth } from '../runtime/types'

interface RuntimeHealthPanelProps {
  health: RuntimeHealth | null
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="runtime-health-row">
      <span className="runtime-health-label">{label}</span>
      <span className={`runtime-health-value ${ok === true ? 'runtime-health-value--ok' : ok === false ? 'runtime-health-value--off' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function RuntimeHealthPanel({ health }: RuntimeHealthPanelProps) {
  if (!health) return null

  return (
    <div className="panel runtime-health-panel">
      <div className="panel-header">
        <span className="panel-title">Runtime</span>
        <span className={`badge ${health.mode === 'mock' ? 'badge-mock' : 'badge-desktop'}`}>
          {health.mode}
        </span>
      </div>

      <div className="runtime-health-rows">
        <HealthRow
          label="Safety Mode"
          value={health.safetyMode.replace(/-/g, ' ')}
        />
        <HealthRow
          label="External Side Effects"
          value={health.externalSideEffectsEnabled ? 'Enabled' : 'Disabled'}
          ok={false}
        />
        <HealthRow
          label="Notion"
          value={health.notionConnected ? 'Connected' : 'Not connected'}
          ok={health.notionConnected}
        />
        <HealthRow
          label="Anthropic"
          value={health.anthropicConnected ? 'Connected' : 'Not connected'}
          ok={health.anthropicConnected}
        />
        <HealthRow
          label="Desktop Shell"
          value={health.desktopShellAvailable ? 'Available' : 'Not available'}
          ok={health.desktopShellAvailable}
        />
      </div>

      <p className="safety-note" style={{ marginTop: 10, marginBottom: 0 }}>
        External side effects are disabled in this MVP. Write operations require human approval.
      </p>
    </div>
  )
}
