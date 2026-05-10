import type { MockRun } from '../model/types'

const TYPE_LABELS: Record<string, string> = {
  capture:      'capture',
  classify:     'classify',
  structure:    'structure',
  human_review: 'review',
  output:       'output',
}

interface RunTimelineProps {
  run: MockRun | null
}

export default function RunTimeline({ run }: RunTimelineProps) {
  return (
    <div className="panel">
      <h2 className="panel-title">Run Timeline</h2>

      {!run ? (
        <p className="panel-placeholder">No run yet — timeline will appear here.</p>
      ) : (
        <div className="timeline">
          {run.steps.map(step => (
            <div key={step.id} className="timeline-item">
              <span className="timeline-item-type">{TYPE_LABELS[step.type] ?? step.type}</span>
              <span
                className={`status-badge status-badge--sm status-badge--${step.status}`}
                style={{ flexShrink: 0 }}
              >
                {step.status}
              </span>
              <span className="timeline-item-msg">{step.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
