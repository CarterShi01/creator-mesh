import type { MockRun } from '../model/types'

interface ResultPanelProps {
  run: MockRun | null
}

export default function ResultPanel({ run }: ResultPanelProps) {
  return (
    <div className="panel">
      <h2 className="panel-title">Result</h2>

      {!run && (
        <p className="result-empty">
          No result yet. Submit a workflow to begin.
        </p>
      )}

      {run?.status === 'paused' && (
        <p className="result-empty" style={{ color: 'var(--color-warning)' }}>
          ⏸ Waiting for human review decision…
        </p>
      )}

      {run?.status === 'rejected' && (
        <p className="result-empty" style={{ color: 'var(--color-danger)' }}>
          ✕ Workflow rejected. No output was written.
        </p>
      )}

      {run?.status === 'changes_requested' && (
        <div>
          <p className="result-empty" style={{ color: 'var(--color-warning)', marginBottom: 8 }}>
            ↩ Changes requested. Awaiting revised workflow.
          </p>
          {run.review.feedback && (
            <div className="review-field">
              <div className="review-field-label">Feedback</div>
              <div className="review-field-value" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                "{run.review.feedback}"
              </div>
            </div>
          )}
        </div>
      )}

      {run?.status === 'completed' && run.result && (
        <div className="result-block">
          <div className="result-title">{run.result.title}</div>

          <div>
            <div className="review-field-label" style={{ marginBottom: 3 }}>Mock Notion URL</div>
            <div className="result-url">
              {run.result.mockNotionUrl}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  background: 'rgba(99,102,241,0.15)',
                  color: '#a5b4fc',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                MOCK
              </span>
            </div>
          </div>

          <div>
            <div className="review-field-label" style={{ marginBottom: 3 }}>Artifact Summary</div>
            <div className="result-summary">{run.result.artifactSummary}</div>
          </div>

          <div>
            <div className="review-field-label" style={{ marginBottom: 3 }}>Next Suggested Action</div>
            <div className="result-next">{run.result.nextSuggestedAction}</div>
          </div>
        </div>
      )}
    </div>
  )
}
