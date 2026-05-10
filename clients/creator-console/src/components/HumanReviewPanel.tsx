import { useState } from 'react'
import type { RuntimeRun } from '../runtime/types'

interface HumanReviewPanelProps {
  run: RuntimeRun | null
  onAccept: () => void
  onReject: () => void
  onRequestChanges: (feedback: string) => void
}

export default function HumanReviewPanel({
  run,
  onAccept,
  onReject,
  onRequestChanges,
}: HumanReviewPanelProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState('')

  const isPaused = run?.status === 'paused'

  function handleRequestChanges() {
    if (!feedback.trim()) return
    onRequestChanges(feedback.trim())
    setShowFeedback(false)
    setFeedback('')
  }

  if (!run) {
    return (
      <div className="panel">
        <h2 className="panel-title">Human Review</h2>
        <p className="panel-placeholder">Run a workflow to see the review boundary here.</p>
      </div>
    )
  }

  const cls = run.classification

  return (
    <div className="panel">
      <h2 className="panel-title">Human Review</h2>

      <p className="safety-note" style={{ marginBottom: 14 }}>
        Human review is the approval boundary before external side effects.
      </p>

      <div className="review-field">
        <div className="review-field-label">Suggested Title</div>
        <div className="review-field-value" style={{ fontWeight: 600 }}>{cls.suggestedTitle}</div>
      </div>

      <div className="review-field">
        <div className="review-field-label">Category</div>
        <div className="review-field-value">{cls.category}</div>
      </div>

      <div className="review-field">
        <div className="review-field-label">Summary</div>
        <div className="review-field-value">{cls.summary}</div>
      </div>

      <div className="review-field">
        <div className="review-field-label">Confidence</div>
        <div className="review-field-value">
          {Math.round(cls.confidence * 100)}%
        </div>
      </div>

      <div className="review-field">
        <div className="review-field-label">Proposed Output</div>
        <div className="review-field-value" style={{ color: 'var(--color-text-muted)' }}>
          {cls.proposedOutput}
        </div>
      </div>

      <div className="review-actions">
        <button
          className="btn btn-success"
          onClick={onAccept}
          disabled={!isPaused}
          type="button"
        >
          ✓ Accept
        </button>
        <button
          className="btn btn-danger"
          onClick={onReject}
          disabled={!isPaused}
          type="button"
        >
          ✕ Reject
        </button>
        <button
          className="btn btn-warning"
          onClick={() => setShowFeedback(v => !v)}
          disabled={!isPaused}
          type="button"
        >
          ↩ Request Changes
        </button>
      </div>

      {showFeedback && isPaused && (
        <div className="review-feedback-area">
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label" htmlFor="review-feedback">Your feedback</label>
            <textarea
              id="review-feedback"
              className="form-textarea"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Describe what needs to change…"
              rows={3}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRequestChanges}
            disabled={!feedback.trim()}
            type="button"
          >
            Submit Feedback
          </button>
        </div>
      )}

      {run.review.decision !== 'pending' && run.review.decision !== 'accepted' && (
        <div style={{ marginTop: 14 }}>
          <div className="review-field-label">Decision</div>
          <div className={`badge badge-status badge-status--${run.status}`} style={{ marginTop: 4 }}>
            {run.review.decision.replace('_', ' ')}
          </div>
          {run.review.feedback && (
            <div className="review-field" style={{ marginTop: 8 }}>
              <div className="review-field-label">Feedback</div>
              <div className="review-field-value" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                "{run.review.feedback}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
