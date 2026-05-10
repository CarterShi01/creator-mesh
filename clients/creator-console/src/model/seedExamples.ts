import type { InputKind } from './types'

export interface SeedExample {
  kind: InputKind
  text: string
  label: string
}

export const seedExamples: SeedExample[] = [
  {
    kind: 'thought',
    label: 'Use thought example',
    text: 'I want to build a tool that turns scattered creator ideas into structured plans and actions.',
  },
  {
    kind: 'message',
    label: 'Use message example',
    text: "Can you help me turn yesterday's meeting notes into a project plan?",
  },
]
