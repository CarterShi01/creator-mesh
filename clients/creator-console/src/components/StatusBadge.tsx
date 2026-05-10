import type { RuntimeStepStatus } from '../runtime/types'

interface StatusBadgeProps {
  status: RuntimeStepStatus | 'idle'
  size?: 'sm' | 'md'
}

const ICONS: Record<string, string> = {
  pending: '○',
  running: '◌',
  completed: '●',
  paused: '◐',
  rejected: '✕',
  skipped: '—',
  idle: '○',
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status} status-badge--${size}`} aria-label={status}>
      {ICONS[status] ?? '○'} {size === 'md' ? status : ''}
    </span>
  )
}
