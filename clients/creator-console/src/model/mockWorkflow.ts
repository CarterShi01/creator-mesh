import type {
  MockRun,
  MockWorkflowStep,
  MockClassification,
  InputKind,
} from './types'

function makeSteps(): MockWorkflowStep[] {
  return [
    {
      id: 'capture',
      label: 'Capture',
      type: 'capture',
      status: 'completed',
      description: 'Input received and normalized.',
    },
    {
      id: 'classify',
      label: 'Classify',
      type: 'classify',
      status: 'completed',
      description: 'Input classified by mock AI agent.',
    },
    {
      id: 'structure',
      label: 'Structure',
      type: 'structure',
      status: 'completed',
      description: 'Structured output draft generated.',
    },
    {
      id: 'human_review',
      label: 'Human Review',
      type: 'human_review',
      status: 'paused',
      description: 'Awaiting human approval before external write.',
    },
    {
      id: 'output',
      label: 'Output',
      type: 'output',
      status: 'pending',
      description: 'Write artifact to target (mock Notion page).',
    },
  ]
}

function deriveClassification(inputText: string, inputKind: InputKind, target: string): MockClassification {
  const isThought = inputKind === 'thought'
  return {
    suggestedTitle: isThought
      ? 'Creator Tool Concept: Idea-to-Plan Pipeline'
      : 'Meeting Notes → Project Plan Conversion',
    category: isThought ? 'Product Idea' : 'Task Planning',
    summary: inputText.length > 80 ? inputText.slice(0, 80) + '…' : inputText,
    confidence: 0.91,
    proposedOutput: `Create a structured page in "${target}" with title, context, action items, and success criteria.`,
  }
}

/** Creates a new paused MockRun waiting at HumanReviewStep. */
export function createMockRun(inputText: string, inputKind: InputKind, target: string): MockRun {
  const runId = `run-${Date.now().toString(36)}`
  return {
    runId,
    inputKind,
    inputText,
    target,
    status: 'paused',
    steps: makeSteps(),
    classification: deriveClassification(inputText, inputKind, target),
    review: { decision: 'pending' },
    createdAt: new Date().toISOString(),
  }
}

function updateStep(steps: MockWorkflowStep[], id: string, status: MockWorkflowStep['status']): MockWorkflowStep[] {
  return steps.map(s => s.id === id ? { ...s, status } : s)
}

/** Accept: marks human_review completed, writes output, run completed. */
export function acceptRun(run: MockRun): MockRun {
  const steps = updateStep(
    updateStep(run.steps, 'human_review', 'completed'),
    'output',
    'completed',
  )
  const result = {
    title: run.classification.suggestedTitle,
    mockNotionUrl: `https://notion.so/mock/${run.runId}`,
    artifactSummary: `Page created in "${run.target}": ${run.classification.suggestedTitle}. Contains context, action items, and success criteria derived from your input.`,
    nextSuggestedAction: 'Review the draft page and assign action items to team members.',
  }
  return {
    ...run,
    status: 'completed',
    steps,
    review: { decision: 'accepted', reviewedAt: new Date().toISOString() },
    result,
  }
}

/** Reject: marks human_review rejected, output skipped, run rejected. */
export function rejectRun(run: MockRun): MockRun {
  const steps = updateStep(
    updateStep(run.steps, 'human_review', 'rejected'),
    'output',
    'skipped',
  )
  return {
    ...run,
    status: 'rejected',
    steps,
    review: { decision: 'rejected', reviewedAt: new Date().toISOString() },
  }
}

/** Request changes: stores feedback, run status becomes changes_requested. */
export function requestChanges(run: MockRun, feedback: string): MockRun {
  const steps = updateStep(
    updateStep(run.steps, 'human_review', 'paused'),
    'output',
    'pending',
  )
  return {
    ...run,
    status: 'changes_requested',
    steps,
    review: {
      decision: 'changes_requested',
      feedback,
      reviewedAt: new Date().toISOString(),
    },
  }
}
