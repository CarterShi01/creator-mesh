import type { RunStatus } from '../model/types'
import { PwaStatus } from './PwaStatus'

interface HeaderProps {
  runStatus: RunStatus
}

export default function Header({ runStatus }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">⬡</span>
        <h1 className="header-title">CreatorMesh Console</h1>
      </div>
      <div className="header-badges">
        <PwaStatus />
        <span className="badge badge-mock">Local Mock Mode</span>
        {runStatus !== 'idle' && (
          <span className={`badge badge-status badge-status--${runStatus}`}>
            {runStatus.replace('_', ' ')}
          </span>
        )}
      </div>
    </header>
  )
}
