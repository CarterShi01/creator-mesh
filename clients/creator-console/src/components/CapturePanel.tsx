import { useState } from 'react'
import type { InputKind } from '../model/types'
import { seedExamples } from '../model/seedExamples'

const TARGETS = [
  'Mock Notion Inbox',
  'Mock Project Plan',
  'Mock Task Queue',
]

interface CapturePanelProps {
  onRun: (text: string, kind: InputKind, target: string) => void
  isRunning: boolean
}

export default function CapturePanel({ onRun, isRunning }: CapturePanelProps) {
  const [kind, setKind] = useState<InputKind>('thought')
  const [text, setText] = useState('')
  const [target, setTarget] = useState(TARGETS[0])
  const [showError, setShowError] = useState(false)

  function handleRun() {
    if (!text.trim()) {
      setShowError(true)
      return
    }
    setShowError(false)
    onRun(text.trim(), kind, target)
  }

  function useSeed(idx: number) {
    const ex = seedExamples[idx]
    if (!ex) return
    setKind(ex.kind)
    setText(ex.text)
    setShowError(false)
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Capture</h2>

      <p className="safety-note">
        No real Notion or Anthropic API calls. All execution is local mock data.
      </p>

      <div className="toggle-group" role="group" aria-label="Input kind">
        {(['thought', 'message'] as InputKind[]).map(k => (
          <button
            key={k}
            className={`toggle-btn${kind === k ? ' active' : ''}`}
            onClick={() => { setKind(k); setShowError(false) }}
            type="button"
          >
            {k === 'thought' ? '💡 Thought' : '💬 Message'}
          </button>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="input-text">
          {kind === 'thought' ? 'Your thought' : 'Your message'}
        </label>
        <textarea
          id="input-text"
          className="form-textarea"
          value={text}
          onChange={e => { setText(e.target.value); setShowError(false) }}
          placeholder={
            kind === 'thought'
              ? 'Describe your idea or intention…'
              : 'Write your message or request…'
          }
          rows={5}
        />
        {showError && (
          <span className="form-error">Please enter some text before running.</span>
        )}
      </div>

      <div className="seed-buttons">
        {seedExamples.map((ex, i) => (
          <button
            key={i}
            className="btn btn-ghost"
            type="button"
            onClick={() => useSeed(i)}
            style={{ fontSize: 12, justifyContent: 'flex-start' }}
          >
            ↙ {ex.label}
          </button>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="target-select">Target</label>
        <select
          id="target-select"
          className="form-select"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        type="button"
        onClick={handleRun}
        disabled={isRunning}
      >
        {isRunning ? '⟳ Running…' : '▶ Run Workflow'}
      </button>
    </div>
  )
}
