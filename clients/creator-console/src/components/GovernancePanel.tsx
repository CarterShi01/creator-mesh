import type { RuntimeRun, GovernanceOutcome } from '../runtime/types'

const OUTCOME_LABELS: Record<GovernanceOutcome, string> = {
  auto_approved: 'Auto-approved',
  approved:      'Approved',
  needs_review:  'Needs review',
  denied:        'Denied',
}

const OUTCOME_CLASS: Record<GovernanceOutcome, string> = {
  auto_approved: 'gov-outcome--auto',
  approved:      'gov-outcome--approved',
  needs_review:  'gov-outcome--needs-review',
  denied:        'gov-outcome--denied',
}

interface GovernancePanelProps {
  run: RuntimeRun | null
}

export function GovernancePanel({ run }: GovernancePanelProps) {
  const decisions = run?.governanceDecisions ?? []

  return (
    <div className="panel governance-panel">
      <div className="panel-header">
        <span className="panel-title">Governance</span>
        {run && (
          <span className="badge badge-desktop" style={{ fontSize: 10 }}>
            {decisions.length} decision{decisions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!run || decisions.length === 0 ? (
        <p className="panel-placeholder">
          Governance decisions will appear here after a workflow runs.
        </p>
      ) : (
        <div className="gov-decisions">
          {decisions.map(d => (
            <div key={d.id} className="gov-decision">
              <div className="gov-decision-header">
                <span className="gov-step-label">{d.stepLabel}</span>
                <span className={`gov-outcome ${OUTCOME_CLASS[d.outcome]}`}>
                  {OUTCOME_LABELS[d.outcome]}
                </span>
              </div>
              <div className="gov-decision-meta">
                <span className="gov-permission">{d.permissionLevel.replace(/_/g, ' ')}</span>
              </div>
              <div className="gov-reason">{d.reason}</div>
            </div>
          ))}
        </div>
      )}

      {!run && (
        <p className="safety-note" style={{ marginTop: 10, marginBottom: 0 }}>
          External side effects are disabled in this MVP. Write operations require human approval.
        </p>
      )}
    </div>
  )
}
