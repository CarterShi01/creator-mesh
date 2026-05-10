import { useState, useEffect, useCallback, useRef } from 'react'
import type { RuntimeRun, RuntimeHealth } from './runtime/types'
import type { WorkflowClient } from './runtime/workflowClient'
import { createWorkflowClient } from './runtime/workflowClient'
import Layout from './components/Layout'
import Header from './components/Header'
import CapturePanel from './components/CapturePanel'
import WorkflowPreview from './components/WorkflowPreview'
import HumanReviewPanel from './components/HumanReviewPanel'
import RunTimeline from './components/RunTimeline'
import ResultPanel from './components/ResultPanel'
import { DesktopStatus } from './components/DesktopStatus'
import { RuntimeHealthPanel } from './components/RuntimeHealthPanel'
import { GovernancePanel } from './components/GovernancePanel'

export default function App() {
  const clientRef = useRef<WorkflowClient | null>(null)
  const [clientReady, setClientReady] = useState(false)
  const [currentRun, setCurrentRun] = useState<RuntimeRun | null>(null)
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth | null>(null)
  const [_allRuns, setAllRuns] = useState<RuntimeRun[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Initialize WorkflowClient once
  useEffect(() => {
    createWorkflowClient().then(client => {
      clientRef.current = client
      setClientReady(true)
      client.getHealth().then(setRuntimeHealth)
    })
  }, [])

  const client = clientRef.current

  const runStatus = currentRun?.status ?? 'idle'

  const handleRun = useCallback(async (text: string, kind: 'thought' | 'message', target: string) => {
    if (!client) return
    setIsLoading(true)
    const response = await client.startRun({ inputKind: kind, inputText: text, target })
    setCurrentRun(response.run)
    const listResponse = await client.listRuns()
    setAllRuns(listResponse.runs)
    setIsLoading(false)
  }, [client])

  const handleAccept = useCallback(async () => {
    if (!client || !currentRun) return
    setIsLoading(true)
    const response = await client.resumeRun(currentRun.runId, { decision: 'accepted' })
    setCurrentRun(response.run)
    const listResponse = await client.listRuns()
    setAllRuns(listResponse.runs)
    setIsLoading(false)
  }, [client, currentRun])

  const handleReject = useCallback(async () => {
    if (!client || !currentRun) return
    setIsLoading(true)
    const response = await client.resumeRun(currentRun.runId, { decision: 'rejected' })
    setCurrentRun(response.run)
    const listResponse = await client.listRuns()
    setAllRuns(listResponse.runs)
    setIsLoading(false)
  }, [client, currentRun])

  const handleRequestChanges = useCallback(async (feedback: string) => {
    if (!client || !currentRun) return
    setIsLoading(true)
    const response = await client.resumeRun(currentRun.runId, { decision: 'changes_requested', feedback })
    setCurrentRun(response.run)
    const listResponse = await client.listRuns()
    setAllRuns(listResponse.runs)
    setIsLoading(false)
  }, [client, currentRun])


  if (!clientReady) {
    return (
      <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>
        Initializing runtime…
      </div>
    )
  }

  return (
    <Layout
      header={<Header runStatus={runStatus} runtimeHealth={runtimeHealth} />}
      capture={
        <CapturePanel
          onRun={handleRun}
          isRunning={isLoading || runStatus === 'running'}
        />
      }
      workflow={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing)' }}>
          <WorkflowPreview run={currentRun} />
          <HumanReviewPanel
            run={currentRun}
            onAccept={handleAccept}
            onReject={handleReject}
            onRequestChanges={handleRequestChanges}
          />
          <GovernancePanel run={currentRun} />
        </div>
      }
      timeline={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing)' }}>
          <RuntimeHealthPanel health={runtimeHealth} />
          <DesktopStatus />
          <RunTimeline run={currentRun} />
          <ResultPanel run={currentRun} />
        </div>
      }
    />
  )
}
