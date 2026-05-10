import type { RunStatus } from '../model/types'
import { PwaStatus } from './PwaStatus'
import { getPlatformInfo } from '../platform/platform'

interface HeaderProps {
  runStatus: RunStatus
}

const platformInfo = getPlatformInfo()

export default function Header({ runStatus }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">⬡</span>
        <h1 className="header-title">CreatorMesh Console</h1>
        {platformInfo.isTauri && (
          <span className="badge badge-desktop">Desktop Shell</span>
        )}
      </div>
      <div className="header-badges">
        <PwaStatus platformLabel={platformInfo.label} />
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
