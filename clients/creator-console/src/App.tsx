import { useState } from 'react'
import type { MockRun, InputKind } from './model/types'
import { createMockRun, acceptRun, rejectRun, requestChanges } from './model/mockWorkflow'
import Layout from './components/Layout'
import Header from './components/Header'
import CapturePanel from './components/CapturePanel'

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
        <div className="panel">
          <h2 className="panel-title">Workflow &amp; Review</h2>
          <p className="panel-placeholder">Workflow preview + Human review — Tasks 06–07</p>
          {run && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-success" onClick={handleAccept} disabled={run.status !== 'paused'}>Accept</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={run.status !== 'paused'}>Reject</button>
              <button className="btn btn-warning" onClick={() => handleRequestChanges('Needs revision')} disabled={run.status !== 'paused'}>Request Changes</button>
            </div>
          )}
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
