import { useState } from 'react'
import type { MockRun, InputKind } from './model/types'
import { createMockRun, acceptRun, rejectRun, requestChanges } from './model/mockWorkflow'
import Layout from './components/Layout'
import Header from './components/Header'
import CapturePanel from './components/CapturePanel'
import WorkflowPreview from './components/WorkflowPreview'
import HumanReviewPanel from './components/HumanReviewPanel'

export default function App() {
  const [run, setRun] = useState<MockRun | null>(null)
  const runStatus = run?.status ?? 'idle'

  function handleRun(text: string, kind: InputKind, target: string) {
    setRun(createMockRun(text, kind, target))
  }

  function handleAccept() {
    if (run) setRun(acceptRun(run))
  }

  function handleReject() {
    if (run) setRun(rejectRun(run))
  }

  function handleRequestChanges(feedback: string) {
    if (run) setRun(requestChanges(run, feedback))
  }

  return (
    <Layout
      header={<Header runStatus={runStatus} />}
      capture={
        <CapturePanel
          onRun={handleRun}
          isRunning={runStatus === 'running'}
        />
      }
      workflow={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing)' }}>
          <WorkflowPreview run={run} />
          <HumanReviewPanel
            run={run}
            onAccept={handleAccept}
            onReject={handleReject}
            onRequestChanges={handleRequestChanges}
          />
        </div>
      }
      timeline={
        <div className="panel">
          <h2 className="panel-title">Timeline &amp; Result</h2>
          <p className="panel-placeholder">Timeline + Result — Task 08</p>
        </div>
      }
    />
  )
}
