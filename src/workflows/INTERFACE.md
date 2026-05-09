# Interface: src/workflows

## Purpose

`workflows` defines end-to-end flows that transform inputs into outputs. A workflow composes agents, runners, connectors, knowledge, and governance into a coherent process that delivers value to the creator.

`WorkflowRunnerPort` is the stable abstraction behind workflow execution engines. `LocalWorkflowRunner` is the phase-1 implementation. Future durable backends (e.g. Trigger.dev) implement the same port.

## Public Concepts

### Execution Port

**`WorkflowRunnerPort`**
The standard interface behind all workflow execution engines. The orchestrator calls this interface; it never imports `LocalWorkflowRunner` directly.

```
WorkflowRunnerPort {
  runnerId: string
  execute(definition: WorkflowDefinition, input: WorkflowInput): Promise<WorkflowResult>
  resume(runId: string, input: WorkflowResumeInput): Promise<WorkflowResult>
  status(runId: string): Promise<WorkflowRunStatus>
  cancel(runId: string): Promise<void>
}
```

**`LocalWorkflowRunner`**
Phase-1 implementation of `WorkflowRunnerPort`. Executes workflow steps in-process, sequentially. Pauses at `HumanReviewStep` and resumes on `WorkflowResumeInput`.

```
LocalWorkflowRunner implements WorkflowRunnerPort {
  runnerId: "local"
}
```

### WorkflowDefinition

**`WorkflowDefinition`**
A declarative, versioned recipe for an end-to-end process.

```
WorkflowDefinition {
  workflowId: string
  name: string
  version: string
  description: string
  inputSchema: WorkflowInputSchema
  steps: WorkflowStep[]
  governanceCheckpoints: GovernanceCheckpoint[]
  tags?: string[]
}
```

**`WorkflowInputSchema`**
Declares the expected shape of `WorkflowInput`. Phase 1: loosely typed. Future: enforced via Zod or similar.

```
WorkflowInputSchema {
  [key: string]: string    // field name → type hint (e.g. "thought: Thought")
}
```

### WorkflowStep Types

**`WorkflowStepType`**
```
"agent" | "connector" | "runner" | "knowledge" | "human-review" | "storage"
```

**`WorkflowStepBase`**
Common fields shared by all step types.

```
WorkflowStepBase {
  stepId: string
  name: string
  type: WorkflowStepType
  description: string
  onSuccess: string | "complete"
  onFailure: string | "fail" | "human-review"
  requiresApproval?: boolean
}
```

**`AgentStep`**
```
AgentStep extends WorkflowStepBase {
  type: "agent"
  agentRole: string
  inputMapping: StepInputMapping
  outputKey: string
}
```

**`ConnectorStep`**
```
ConnectorStep extends WorkflowStepBase {
  type: "connector"
  connectorId: string
  capabilityType: CapabilityType      // from src/connectors
  resourceType: string
  inputMapping: StepInputMapping
  outputKey: string
}
```

**`RunnerStep`**
```
RunnerStep extends WorkflowStepBase {
  type: "runner"
  runnerId: string
  taskType: RunnerTaskType            // from src/runners
  inputMapping: StepInputMapping
  outputKey: string
}
```

**`KnowledgeStep`**
```
KnowledgeStep extends WorkflowStepBase {
  type: "knowledge"
  operation: "read" | "write" | "classify" | "link"
  inputMapping: StepInputMapping
  outputKey: string
}
```

**`HumanReviewStep`**
```
HumanReviewStep extends WorkflowStepBase {
  type: "human-review"
  prompt: string
  acceptLabel: string
  rejectLabel: string
  onAccept: string | "complete"
  onReject: string | "fail" | string
}
```

**`StorageStep`**
```
StorageStep extends WorkflowStepBase {
  type: "storage"
  operation: "save" | "load"
  storageKey: string
  inputMapping: StepInputMapping
  outputKey: string
}
```

**`WorkflowStep`** (union)
```
WorkflowStep =
  AgentStep | ConnectorStep | RunnerStep
  | KnowledgeStep | HumanReviewStep | StorageStep
```

### Governance

**`GovernanceCheckpoint`**
Declares an approval gate for a step or step type within the workflow definition.

```
GovernanceCheckpoint {
  stepId?: string
  stepType?: WorkflowStepType
  approvalRequirement: "always" | "conditional" | "never"
  reason: string
}
```

### Input Mapping

**`StepInputMapping`**
Declarative mapping of step inputs from workflow input or prior step outputs.

```
StepInputMapping {
  [inputKey: string]: string   // "$input.fieldName" or "$steps.stepId.outputKey"
}
```

### Workflow Run

**`WorkflowRun`**
A specific execution instance of a `WorkflowDefinition`.

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

**`WorkflowRunStatus`**
```
"created" | "running" | "paused" | "completed" | "failed" | "cancelled"
```

**`WorkflowContext`**
In-flight context shared across steps within a workflow run.

```
WorkflowContext {
  runId: string
  workflowId: string
  input: WorkflowInput
  stepOutputs: Record<string, unknown>
  currentStepId: string
  createdAt: Date
}
```

**`WorkflowStepRecord`**
State record for a single step execution within a `WorkflowRun`.

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
  auditId?: string
}
```

### Input / Output

**`WorkflowInput`**
```
WorkflowInput {
  [key: string]: unknown
}
```

**`WorkflowOutput`**
```
WorkflowOutput {
  [key: string]: unknown
}
```

**`WorkflowResult`**
```
WorkflowResult {
  runId: string
  status: "completed" | "failed" | "paused" | "cancelled"
  output?: WorkflowOutput
  error?: string
  pausedAt?: WorkflowPauseState
  completedAt?: Date
}
```

**`WorkflowPauseState`**
```
WorkflowPauseState {
  stepId: string
  prompt: string
  acceptLabel: string
  rejectLabel: string
}
```

**`WorkflowResumeInput`**
```
WorkflowResumeInput {
  decision: "accept" | "reject"
  annotations?: string
  revisedInput?: unknown
}
```

## Inputs

- `WorkflowDefinition` (static, authored by the system or developer)
- `WorkflowInput` from `src/orchestrator`
- `WorkflowResumeInput` from `src/orchestrator` (after creator review)
- `AgentOutput` from `src/agents` (via step execution, mediated by orchestrator)
- `ConnectorResult` from `src/connectors` (via `ConnectorStep`, mediated by orchestrator)
- `RunnerResult` from `src/runners` (via `RunnerStep`, mediated by orchestrator)
- `ApprovalResult` from `src/governance` (via orchestrator before executing approved steps)

## Outputs

- `WorkflowResult` → `src/orchestrator`
- `WorkflowRun` state updates → `src/storage`
- `WorkflowPauseState` → `src/orchestrator` (surfaced to creator at `HumanReviewStep`)

## Allowed Dependencies

- `src/core`
- `src/shared`
- `src/orchestrator`
- `src/agents`
- `src/runners`
- `src/connectors`
- `src/knowledge`
- `src/governance`
- `src/storage`

## Disallowed Dependencies

- `src/triggers` (workflows do not handle raw input signals)
- `src/intake` (workflows receive normalized items, not raw payloads)
- `src/outputs` (output formatting is handled by the outputs layer, not workflows)

## Invariants

- **Workflows do not call `ConnectorPort.execute()` or `RunnerPort.execute()` directly.** All external calls are mediated by the orchestrator. This ensures governance checkpoints are never bypassed.
- **Workflow definitions must declare governance checkpoints explicitly.** Approval requirements must not be hidden in step implementation code.
- **`WorkflowRun` state is persisted after each step.** A crashed run must be resumable from the last completed step.
- **`HumanReviewStep` is a first-class step type.** Pausing is a normal workflow state, not an error condition.
- **All callers use `WorkflowRunnerPort`.** No caller imports `LocalWorkflowRunner` directly.
- **`WorkflowDefinition` is readable without execution.** The full step sequence, governance checkpoints, and input/output mappings must be inspectable as data.

## Main Files

No implementation files exist yet.

Planned file structure:

- `types.ts` — `WorkflowStepType`, `WorkflowRunStatus`, and all step type interfaces
- `port.ts` — `WorkflowRunnerPort`, `WorkflowDefinition`, `WorkflowRun`, `WorkflowContext`, `WorkflowResult`, `WorkflowResumeInput`, `GovernanceCheckpoint`, `StepInputMapping`
- `local-runner.ts` — `LocalWorkflowRunner` implementing `WorkflowRunnerPort`
- `index.ts` — barrel re-exports
- `definitions/` — concrete `WorkflowDefinition` objects (e.g. `thought-to-note.ts`)

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `DESIGN.md` — the full WorkflowPort and WorkflowDefinition design.
4. Read this `INTERFACE.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
7. Apply bottom-up propagation: check whether `src/orchestrator` INTERFACE.md or DESIGN.md needs a corresponding update.
