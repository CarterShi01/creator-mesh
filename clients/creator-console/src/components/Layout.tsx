import type { ReactNode } from 'react'

interface LayoutProps {
  header: ReactNode
  capture: ReactNode
  workflow: ReactNode
  timeline: ReactNode
}

export default function Layout({ header, capture, workflow, timeline }: LayoutProps) {
  return (
    <div className="layout">
      {header}
      <div className="layout-body">
        <aside className="layout-left">
          {capture}
        </aside>
        <main className="layout-center">
          {workflow}
        </main>
        <aside className="layout-right">
          {timeline}
        </aside>
      </div>
    </div>
  )
}
