import type { RuntimeRun, RuntimeRunStatus } from '../runtime/types'

const STATUS_BADGE: Record<RuntimeRunStatus, string> = {
  running:           'badge-status--running',
  paused:            'badge-status--paused',
  completed:         'badge-status--completed',
  rejected:          'badge-status--rejected',
  changes_requested: 'badge-status--changes_requested',
  cancelled:         'badge-status--idle',
}

interface RunHistoryPanelProps {
  runs: RuntimeRun[]
  selectedRunId: string | null
  onSelectRun: (run: RuntimeRun) => void
}

function shortPreview(text: string): string {
  return text.length > 48 ? text.slice(0, 48) + '…' : text
}

function relativeTime(isoString: string): string {
  const delta = Date.now() - new Date(isoString).getTime()
  if (delta < 60_000) return 'just now'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return new Date(isoString).toLocaleDateString()
}

export function RunHistoryPanel({ runs, selectedRunId, onSelectRun }: RunHistoryPanelProps) {
  return (
    <div className="panel run-history-panel">
      <div className="panel-header">
        <span className="panel-title">Run History</span>
        {runs.length > 0 && (
          <span className="badge badge-desktop" style={{ fontSize: 10 }}>
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {runs.length === 0 ? (
        <p className="panel-placeholder">No runs yet.</p>
      ) : (
        <div className="run-history-list">
          {runs.map(run => (
            <button
              key={run.runId}
              className={`run-history-item ${run.runId === selectedRunId ? 'run-history-item--active' : ''}`}
              onClick={() => onSelectRun(run)}
              type="button"
            >
              <div className="run-history-item-header">
                <span className="run-history-kind">{run.inputKind}</span>
                <span className={`badge badge-status ${STATUS_BADGE[run.status]}`} style={{ fontSize: 10 }}>
                  {run.status.replace('_', ' ')}
                </span>
              </div>
              <div className="run-history-preview">
                {shortPreview(run.inputText)}
              </div>
              <div className="run-history-meta">
                <span>{relativeTime(run.createdAt)}</span>
                {run.classification?.suggestedTitle && (
                  <span className="run-history-title-hint">
                    {shortPreview(run.classification.suggestedTitle)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
