import { useState } from 'react'
import type { MockRun } from './model/types'
import Layout from './components/Layout'
import Header from './components/Header'

export default function App() {
  const [run, _setRun] = useState<MockRun | null>(null)
  const runStatus = run?.status ?? 'idle'

  return (
    <Layout
      header={<Header runStatus={runStatus} />}
      capture={
        <div className="panel">
          <h2 className="panel-title">Capture</h2>
          <p className="panel-placeholder">Input panel — coming in Task 05</p>
        </div>
      }
      workflow={
        <div className="panel">
          <h2 className="panel-title">Workflow &amp; Review</h2>
          <p className="panel-placeholder">Workflow preview + Human review — Tasks 06–07</p>
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
