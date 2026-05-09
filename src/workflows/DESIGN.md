# Design: src/workflows

## Current Design Summary

`src/workflows` is the highest-level integration layer of CreatorMesh. It defines end-to-end flows that compose agents, runners, connectors, and governance into coherent processes delivering value to the creator.

The workflow model has four core components:

1. **WorkflowDefinition** — a declarative, versioned recipe for an end-to-end process: steps, inputs, outputs, and governance checkpoints
2. **WorkflowRunnerPort** — the stable interface behind which execution engines (LocalWorkflowRunner, Trigger.dev) sit
3. **WorkflowRun** — a specific execution instance of a workflow definition, with full lifecycle state
4. **LocalWorkflowRunner** — the minimal phase-1 runner that validates the workflow model in-process without a durable execution framework

No implementation files exist yet. This document captures the full workflow port design.

## Design Goals

- Express CreatorMesh's main product value: thoughts and messages becoming structured knowledge, plans, actions, and shipped products.
- Compose agents, runners, connectors, and governance into readable, auditable workflow definitions.
- Keep workflow definitions decoupled from connector-specific and runner-specific implementation details.
- Keep the workflow execution engine replaceable behind `WorkflowRunnerPort` without rewriting workflow definitions.
- Make governance checkpoints explicit in the workflow definition — not hidden in execution logic.
- Make every workflow run inspectable, pausable, and resumable by the creator.

## What a Workflow Is

A workflow is a **named, versioned, auditable sequence of steps** that transforms a `WorkflowInput` into a `WorkflowOutput`.

A workflow definition:
- Declares its steps and their types (agent, connector, runner, knowledge, human-review, storage)
- Declares governance checkpoints (which steps require human approval before execution)
- Is readable and auditable as a data structure, independent of execution
- Is not specific to any connector or runner — it references them by port interface

A workflow run:
- Is a specific execution of a workflow definition
- Carries its lifecycle state (created → running → paused → completed | failed | cancelled)
- Records each step's input, output, status, and audit reference
- Can be paused at a `HumanReviewStep` and resumed after creator confirmation

## WorkflowRunnerPort

`WorkflowRunnerPort` is the stable interface behind workflow execution engines.

```
WorkflowRunnerPort {
  runnerId: string
  execute(definition: WorkflowDefinition, input: WorkflowInput): Promise<WorkflowResult>
  resume(runId: string, input: WorkflowResumeInput): Promise<WorkflowResult>
  status(runId: string): Promise<WorkflowRunStatus>
  cancel(runId: string): Promise<void>
}
```

`execute()` starts a new workflow run from a definition and input. Returns immediately with a `WorkflowResult` whose status may be `"pending"` if the run is async or paused.

`resume()` continues a paused workflow run after human review or approval. Carries a `WorkflowResumeInput` with the creator's decision and optional annotations.

`status()` returns the current state of a workflow run, including the current step and step history.

`cancel()` stops a running or paused workflow. Records a cancellation audit record.

All callers (orchestrator) interact with `WorkflowRunnerPort`, never with `LocalWorkflowRunner` or a specific execution engine directly.

## LocalWorkflowRunner

`LocalWorkflowRunner` is the phase-1 implementation of `WorkflowRunnerPort`.

It executes workflow steps in-process, sequentially, without a durable execution backend.

Characteristics:
- Runs in the same process as the orchestrator
- Executes steps sequentially (no parallel step execution at v1)
- Persists `WorkflowRun` state to `src/storage` after each step
- Pauses at `HumanReviewStep` and returns `WorkflowResult.status: "paused"` to the orchestrator
- Resumes when orchestrator calls `resume()` with the creator's input

`LocalWorkflowRunner` is intentionally minimal. It validates the workflow model and governance model before introducing durable execution complexity.

When durable execution becomes necessary (long-running tasks, retries, queues, background jobs, observability), a `TriggerDevRunner` may be introduced behind the same `WorkflowRunnerPort` without changing workflow definitions.

## WorkflowDefinition

A workflow definition is a declarative specification of an end-to-end process.

```
WorkflowDefinition {
  workflowId: string                        // unique identifier (e.g. "thought-to-note")
  name: string
  version: string                           // semver or date-based (e.g. "1.0.0")
  description: string
  inputSchema: WorkflowInputSchema          // declares expected input shape
  steps: WorkflowStep[]                     // ordered list of steps
  governanceCheckpoints: GovernanceCheckpoint[]  // explicit approval gates
  tags?: string[]
}
```

`steps` defines the sequence of operations. Step ordering is explicit in the array. Conditional branching (if/else) is deferred to a later version.

`governanceCheckpoints` declares which steps require human approval before execution. This is separate from step-level approval flags — it allows workflow authors to declare approval policy at the workflow level, not buried in step code.

## WorkflowStep Types

A `WorkflowStep` is one operation in a workflow. All step types share a common base:

```
WorkflowStepBase {
  stepId: string
  name: string
  type: WorkflowStepType
  description: string
  onSuccess: string | "complete"    // stepId of the next step, or "complete"
  onFailure: string | "fail" | "human-review"
  requiresApproval?: boolean        // override governance checkpoint if needed
}
```

### AgentStep

Delegates a reasoning task to an agent role.

```
AgentStep extends WorkflowStepBase {
  type: "agent"
  agentRole: string             // e.g. "thought-agent", "message-agent"
  inputMapping: StepInputMapping
  outputKey: string             // key under which output is stored in WorkflowContext
}
```

### ConnectorStep

Calls an external system through a connector via `ConnectorPort`.

```
ConnectorStep extends WorkflowStepBase {
  type: "connector"
  connectorId: string           // e.g. "notion", "github"
  capabilityType: CapabilityType
  resourceType: string
  inputMapping: StepInputMapping
  outputKey: string
}
```

Before execution: orchestrator checks `approvalRequirement` from connector's `CapabilityRegistry`. If `"always"` or `"conditional"` and governance policy requires it, a `HumanReviewStep` is inserted automatically, or execution is blocked until approval.

### RunnerStep

Delegates a task to an execution runner via `RunnerPort`.

```
RunnerStep extends WorkflowStepBase {
  type: "runner"
  runnerId: string              // e.g. "claude-code", "local-script", "human"
  taskType: RunnerTaskType
  inputMapping: StepInputMapping
  outputKey: string
}
```

Before execution: orchestrator checks `approvalRequirement` from runner's `RunnerRegistry`. Same approval model as `ConnectorStep`.

### KnowledgeStep

Reads from or writes to the knowledge layer.

```
KnowledgeStep extends WorkflowStepBase {
  type: "knowledge"
  operation: "read" | "write" | "classify" | "link"
  inputMapping: StepInputMapping
  outputKey: string
}
```

### HumanReviewStep

Pauses the workflow and surfaces a review prompt to the creator.

```
HumanReviewStep extends WorkflowStepBase {
  type: "human-review"
  prompt: string                // human-readable question or instruction
  acceptLabel: string           // label for the "approve/continue" action
  rejectLabel: string           // label for the "reject/revise" action
  onAccept: string | "complete"
  onReject: string | "fail" | string   // target step for revision loop
}
```

`HumanReviewStep` pauses the `WorkflowRun`. The orchestrator surfaces the prompt to the creator, waits for a `WorkflowResumeInput`, then calls `WorkflowRunnerPort.resume()`.

### StorageStep

Persists or retrieves state from storage.

```
StorageStep extends WorkflowStepBase {
  type: "storage"
  operation: "save" | "load"
  storageKey: string
  inputMapping: StepInputMapping
  outputKey: string
}
```

## GovernanceCheckpoint

A `GovernanceCheckpoint` declares an approval gate for a specific step or step type within the workflow definition.

```
GovernanceCheckpoint {
  stepId?: string               // specific step, or undefined for all steps of the given type
  stepType?: WorkflowStepType   // applies to all steps of this type if stepId is absent
  approvalRequirement: "always" | "conditional" | "never"
  reason: string                // human-readable explanation shown during approval
}
```

Governance checkpoints in the workflow definition override the connector's or runner's default `approvalRequirement`. This allows a workflow author to require explicit approval for every connector write in this workflow, even if the connector declares `"conditional"` by default.

## WorkflowContext

The in-flight context shared across steps within a single workflow run.

```
WorkflowContext {
  runId: string
  workflowId: string
  input: WorkflowInput
  stepOutputs: Record<string, unknown>  // keyed by step outputKey
  currentStepId: string
  createdAt: Date
}
```

`stepOutputs` accumulates each step's output so later steps can reference earlier outputs via `StepInputMapping`.

## StepInputMapping

Declares how a step's inputs are derived from workflow input and prior step outputs.

```
StepInputMapping {
  [inputKey: string]: string    // "$input.fieldName" or "$steps.stepId.outputKey"
}
```

Example:
```
inputMapping: {
  "thought": "$input.thought",
  "context": "$steps.classify.structuredThought"
}
```

This declarative mapping keeps step logic decoupled from specific context access patterns and makes workflows readable without executing them.

## WorkflowRun Lifecycle

```
WorkflowRun {
  runId: string
  workflowId: string
  workflowVersion: string
  status: WorkflowRunStatus
  input: WorkflowInput
  context: WorkflowContext
  stepHistory: WorkflowStepRecord[]
  startedAt: Date
  pausedAt?: Date
  completedAt?: Date
  result?: WorkflowResult
}
```

**Lifecycle states:**

```
WorkflowRunStatus =
  "created"     // run created, not yet started
  | "running"   // actively executing a step
  | "paused"    // waiting at a HumanReviewStep for creator input
  | "completed" // all steps completed successfully
  | "failed"    // a step failed and onFailure is "fail"
  | "cancelled" // explicitly cancelled by creator or orchestrator
```

**Step record:**

```
WorkflowStepRecord {
  stepId: string
  type: WorkflowStepType
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  input?: unknown
  output?: unknown
  error?: string
  startedAt?: Date
  completedAt?: Date
  auditId?: string         // references AuditRecord in src/governance
}
```

## WorkflowInput and WorkflowOutput

```
WorkflowInput {
  [key: string]: unknown   // shape declared by WorkflowDefinition.inputSchema
}

WorkflowOutput {
  [key: string]: unknown   // shape declared by workflow definition
}
```

For phase 1, inputs and outputs are loosely typed (`unknown`). Typed schema validation can be introduced later.

## WorkflowResult

```
WorkflowResult {
  runId: string
  status: "completed" | "failed" | "paused" | "cancelled"
  output?: WorkflowOutput
  error?: string
  pausedAt?: WorkflowPauseState   // present when status is "paused"
  completedAt?: Date
}

WorkflowPauseState {
  stepId: string
  prompt: string        // the HumanReviewStep prompt to surface to the creator
  acceptLabel: string
  rejectLabel: string
}
```

## WorkflowResumeInput

Input provided when a creator resumes a paused workflow.

```
WorkflowResumeInput {
  decision: "accept" | "reject"
  annotations?: string          // optional creator notes for the audit record
  revisedInput?: unknown        // optional revised input if the workflow supports revision loops
}
```

## ConnectorAction Integration

When a `ConnectorStep` executes, the orchestrator:

1. Reads the step's `connectorId` and `capabilityType`.
2. Looks up the connector's `CapabilityRegistry` to determine `approvalRequirement`.
3. If approval is needed, requests it from `src/governance`.
4. Constructs a `ConnectorAction` with `approvalResult` set.
5. Calls `ConnectorPort.execute(action)`.
6. Records `ConnectorResult.auditId` in the `WorkflowStepRecord`.

The workflow definition does not call `ConnectorPort.execute()` directly — this is always mediated by the orchestrator.

## RunnerAction Integration

When a `RunnerStep` executes, the orchestrator:

1. Reads the step's `runnerId` and `taskType`.
2. Looks up the runner's `RunnerRegistry` to determine `approvalRequirement`.
3. If approval is needed, requests it from `src/governance`.
4. Constructs a `RunnerAction` with `approvalResult` set, including `RunnerContext` from `StepInputMapping`.
5. Calls `RunnerPort.execute(action)`.
6. Records `RunnerResult.auditId` in the `WorkflowStepRecord`.
7. If `RunnerResult.status` is `"pending"` (async), the orchestrator polls or waits for completion before advancing to the next step.

## First Workflow: ThoughtToNoteWorkflow

The first workflow validates the model end-to-end.

```
ThoughtToNoteWorkflow: WorkflowDefinition {
  workflowId: "thought-to-note"
  name: "Thought to Structured Note"
  version: "0.1.0"
  description: "Normalize a raw Thought into a structured note and optionally sync to Notion"
  steps: [
    AgentStep(id: "classify", agentRole: "thought-agent")
    HumanReviewStep(id: "review-classification", prompt: "Does this classification look correct?")
    ConnectorStep(id: "write-notion", connectorId: "notion", capabilityType: "create", resourceType: "page")
  ]
  governanceCheckpoints: [
    { stepId: "write-notion", approvalRequirement: "always", reason: "Writing to Notion requires explicit approval" }
  ]
}
```

This workflow does not implement destructive Notion operations. It prefers `create` and `append`. The governance checkpoint forces explicit approval before any Notion write.

## Key Decisions

- **WorkflowRunnerPort is the stable interface.** `LocalWorkflowRunner` is the phase-1 implementation; Trigger.dev may replace it later without changing workflow definitions.
- **WorkflowDefinition is declarative data + TypeScript types.** Not runtime-evaluated code at the workflow level — steps declare what to do, the runner decides how to execute.
- **Governance checkpoints are in the definition, not the executor.** Approval requirements are visible to anyone who reads the definition, not hidden in execution code.
- **Workflows do not call `ConnectorPort` or `RunnerPort` directly.** All external calls are mediated by the orchestrator. This ensures approval checkpoints are never skipped.
- **HumanReviewStep is a first-class step type.** Not an edge case or an override — it is a named, auditable pause in the workflow.
- **StepInputMapping is declarative.** Steps do not access `WorkflowContext` directly; inputs are mapped explicitly. This makes step inputs readable from the definition.
- **Phase 1 uses sequential, in-process execution.** Parallel steps, durable execution, and retry policies are deferred.

## Tradeoffs

- Declarative `WorkflowDefinition` (data) vs. executable code: code is more flexible but harder to audit; data is auditable but limits expressiveness. Phase 1 uses TypeScript types as the declaration format — structured enough to read, flexible enough for early iteration.
- Passing all connector and runner calls through the orchestrator adds an indirection layer. This is intentional — it ensures approval checkpoints are never bypassed and the audit trail is complete.
- `StepInputMapping` with string-literal references (`"$input.x"`, `"$steps.y.z"`) is simple but not type-safe. Typed mappings can be introduced with schema validation later.

## Alternatives Considered

- **Workflows calling `ConnectorPort` directly** — acceptable but risky. All calls through orchestrator ensures governance is never skipped.
- **TypeScript functions as workflow definitions** — rejected for readability. A function cannot be read and audited as data. The declarative step array is readable without execution.
- **Trigger.dev as the first execution engine** — deferred. `LocalWorkflowRunner` is sufficient for phase 1. Trigger.dev adds infrastructure complexity before it is needed.
- **Parallel step execution in phase 1** — deferred. Sequential execution is sufficient to validate the model. Parallelism adds coordination complexity without phase-1 benefit.

## Current Assumptions

- The first workflow to implement is `ThoughtToNoteWorkflow`.
- `WorkflowDefinition` is expressed as TypeScript const objects at v1, not external YAML or JSON.
- All `WorkflowRun` records are persisted to `src/storage` after each step completes.
- The orchestrator is responsible for driving the workflow through steps — `WorkflowRunnerPort` receives the definition and orchestrates internally.

## Open Questions

- **Step branching**: Should phase 1 support conditional branching (if agent output meets condition X, go to step A; else go to step B)? Linear step sequences cover `ThoughtToNoteWorkflow`; branching may be needed for `MessageToActionWorkflow`. Deferred for now — `onSuccess` and `onFailure` routing provides basic branching.
- **Async step coordination**: For async `RunnerStep` results (e.g. long-running Claude Code write tasks), should the orchestrator poll on a timer, or should the runner push a completion callback? Phase 1 may use synchronous blocking even for `write` tasks and treat async coordination as a v2 concern.
- **WorkflowInput schema validation**: Should `WorkflowDefinition.inputSchema` be enforced at runtime with Zod or a similar validator? Phase 1 may defer validation and rely on TypeScript types.
- **Revision loops**: `HumanReviewStep.onReject` can target an earlier step to create a feedback loop (e.g. reject classification → re-run agent step). How many revision cycles should be allowed before the workflow fails?

## Future Evolution

- Additional workflows: `MessageToActionWorkflow`, `IdeaToProjectPlanWorkflow`, `WeeklyReviewWorkflow`, `CognitiveTreeWorkflow`.
- `TriggerDevRunner` implementing `WorkflowRunnerPort` for durable, retryable, background execution.
- Parallel step execution within a workflow for steps without data dependencies.
- A workflow editor or visual builder (React Flow) as a future UI layer over `WorkflowDefinition` data.
- Dynamic governance policies from `src/governance` overriding per-step and per-workflow defaults.

## ChatGPT Handoff Context

`src/workflows` has no implementation yet. The design defines:
- `WorkflowRunnerPort` — `execute()`, `resume()`, `status()`, `cancel()` — stable interface for execution engines
- `LocalWorkflowRunner` — phase-1 in-process sequential executor behind `WorkflowRunnerPort`
- `WorkflowDefinition` — declarative: `steps[]` (AgentStep / ConnectorStep / RunnerStep / KnowledgeStep / HumanReviewStep / StorageStep) + `governanceCheckpoints[]`
- `WorkflowRun` lifecycle: created → running → paused → completed | failed | cancelled
- `WorkflowContext` carries `stepOutputs` across steps; `StepInputMapping` declares step inputs declaratively
- `HumanReviewStep` pauses run; orchestrator resumes via `WorkflowResumeInput`
- ConnectorStep → orchestrator → ConnectorPort (never direct); RunnerStep → orchestrator → RunnerPort (never direct)
- First workflow: `ThoughtToNoteWorkflow` (classify → human-review → write-notion with always-approve governance checkpoint)
- Trigger.dev deferred; LocalWorkflowRunner validates model first
- Key open question: conditional step branching and async RunnerStep result coordination
