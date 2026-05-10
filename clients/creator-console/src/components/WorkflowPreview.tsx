import type { RuntimeRun, RuntimeStepStatus } from '../runtime/types'

const STEP_ICONS: Record<RuntimeStepStatus, string> = {
  pending:   '○',
  running:   '◌',
  completed: '✓',
  paused:    '⏸',
  rejected:  '✕',
  skipped:   '—',
}

interface WorkflowPreviewProps {
  run: RuntimeRun | null
}

export default function WorkflowPreview({ run }: WorkflowPreviewProps) {
  return (
    <div className="panel">
      <h2 className="panel-title">Workflow Preview</h2>

      {!run ? (
        <p className="panel-placeholder">
          Run a workflow to see step progress here.
        </p>
      ) : (
        <div className="workflow-steps">
          {run.steps.map((step, idx) => (
            <div key={step.id} className={`workflow-step workflow-step--${step.status}`}>
              <div className={`workflow-step-icon workflow-step-icon--${step.status}`}>
                {STEP_ICONS[step.status]}
              </div>
              <div className="workflow-step-body">
                <div className="workflow-step-label">
                  {idx + 1}. {step.label}
                  <span
                    className={`status-badge status-badge--sm status-badge--${step.status}`}
                    style={{ marginLeft: 8 }}
                  >
                    {step.status}
                  </span>
                </div>
                <div className="workflow-step-desc">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="safety-note" style={{ marginTop: run ? 0 : 12, marginBottom: 0 }}>
        This mirrors a real CreatorMesh WorkflowDefinition, but currently uses local mock data.
      </p>
    </div>
  )
}
