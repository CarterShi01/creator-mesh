import { useState, useEffect, useCallback, useRef } from 'react'
import type { RuntimeRun, RuntimeHealth } from './runtime/types'
import type { WorkflowClient } from './runtime/workflowClient'
import { createWorkflowClient } from './runtime/workflowClient'
import { getSessionBridge } from './session/mockSessionBridge'
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
import { RunHistoryPanel } from './components/RunHistoryPanel'
import { DesktopHostPanel } from './components/session/DesktopHostPanel'
import { MobileRemotePanel } from './components/session/MobileRemotePanel'
import { SessionEventLog } from './components/session/SessionEventLog'
import { ConnectedSurfacesPanel } from './components/session/ConnectedSurfacesPanel'

export default function App() {
  const clientRef = useRef<WorkflowClient | null>(null)
  const [clientReady, setClientReady] = useState(false)
  const [currentRun, setCurrentRun] = useState<RuntimeRun | null>(null)
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth | null>(null)
  const [allRuns, setAllRuns] = useState<RuntimeRun[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSession, setShowSession] = useState(false)

  const bridge = getSessionBridge()

  // Initialize WorkflowClient once and share with session bridge
  useEffect(() => {
    createWorkflowClient().then(client => {
      clientRef.current = client
      // Share the same client with the session bridge so they use one RunLedger
      bridge.setWorkflowClient(client)
      setClientReady(true)
      client.getHealth().then(setRuntimeHealth)
    })
  }, [bridge])

  // Subscribe to session bridge events to refresh run state after remote commands
  useEffect(() => {
    const unsub = bridge.subscribeToEvents(async () => {
      const client = clientRef.current
      if (!client) return
      const listResponse = await client.listRuns()
      setAllRuns(listResponse.runs)
      // Refresh current run if it has changed
      const session = bridge.getCurrentSession()
      if (session?.activeRunId && clientRef.current) {
        const runResponse = await clientRef.current.getRun(session.activeRunId)
        if (runResponse.run) setCurrentRun(runResponse.run)
      }
    })
    return unsub
  }, [bridge])

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
          <RunHistoryPanel
            runs={allRuns}
            selectedRunId={currentRun?.runId ?? null}
            onSelectRun={setCurrentRun}
          />

          {/* Session Bridge toggle */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '12px', width: '100%' }}
              onClick={() => setShowSession(s => !s)}
            >
              {showSession ? '▲ Hide' : '▼ Show'} Session Bridge / Remote Control
            </button>
          </div>

          {showSession && (
            <>
              <DesktopHostPanel />
              <MobileRemotePanel />
              <ConnectedSurfacesPanel />
              <SessionEventLog />
            </>
          )}

          <DesktopStatus />
          <RunTimeline run={currentRun} />
          <ResultPanel run={currentRun} />
        </div>
      }
    />
  )
}
