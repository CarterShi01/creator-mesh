import { useState, useEffect, useCallback } from 'react'
import { getSessionBridge } from '../../session/mockSessionBridge'
import type { SessionEvent } from '../../session/types'

export function SessionEventLog() {
  const [events, setEvents] = useState<SessionEvent[]>([])
  const bridge = getSessionBridge()

  const refresh = useCallback(() => {
    setEvents(bridge.listEvents().slice().reverse())
  }, [bridge])

  useEffect(() => {
    refresh()
    const unsub = bridge.subscribeToEvents(() => refresh())
    return unsub
  }, [bridge, refresh])

  return (
    <section className="panel session-event-log">
      <h2 className="panel-title">Session Event Log</h2>
      {events.length === 0 && (
        <p className="empty-state-small">No events yet. Create a host session to begin.</p>
      )}
      {events.length > 0 && (
        <div className="event-log-list">
          {events.map(evt => (
            <div key={evt.eventId} className="event-log-item">
              <span className="event-time">{formatTime(evt.timestamp)}</span>
              <span className="event-type">{evt.type}</span>
              <span className="event-message">{evt.message}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}
