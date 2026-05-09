# Interface: src/orchestrator

## Purpose

`orchestrator` is the control layer of CreatorMesh. It coordinates agents, runners, connectors, and governance checkpoints to execute workflow steps. It delegates domain work to registered adapters — it does not reason, call external APIs, or manage storage directly.

## Public Concepts

### Orchestrator

**`Orchestrator`**
Implements `StepExecutor` from `src/workflows`. Accepts registries of agents, connectors, and runners at construction. Dispatches workflow steps to the appropriate adapter.

```
Orchestrator implements StepExecutor {
  constructor(
    agentRoles: Map<string, AgentRole>,
    connectors: Map<string, ConnectorPort>,
    runners: Map<string, RunnerPort>
  )
  executeStep(
    step: WorkflowStep,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Promise<unknown>
}
```

### StepExecutor (defined in src/workflows/port.ts)

```
StepExecutor {
  executeStep(
    step: WorkflowStep,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Promise<unknown>
}
```

`LocalWorkflowRunner` accepts an optional `StepExecutor` at construction. When present, it calls `executeStep()` instead of returning stub output for non-HumanReview steps.

## Supported Step Types

| Step Type | Dispatched To |
|-----------|--------------|
| `"agent"` | `AgentRole` from `src/agents` |
| `"connector"` | `ConnectorPort` from `src/connectors` |
| `"runner"` | `RunnerPort` from `src/runners` |
| `"human-review"` | Handled by `LocalWorkflowRunner` directly (pause/resume) |
| `"knowledge"` / `"storage"` | Not supported in MVP — throws error |

## Input Mapping Resolution

Input mapping references follow a `$input.*` / `$steps.*.*` convention:

| Reference pattern | Resolves to |
|------------------|------------|
| `"$input.fieldName"` | `workflowInput[fieldName]` |
| `"$steps.stepId.outputKey"` | `stepOutputs[stepId][outputKey]` |
| Any other string | Passed as literal value |

## Allowed Dependencies

- `src/core`
- `src/shared`
- `src/agents` (AgentRole interface)
- `src/connectors` (ConnectorPort interface)
- `src/runners` (RunnerPort interface)
- `src/workflows` (StepExecutor, WorkflowStep, WorkflowInput)

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/governance` (deferred — MVP skips approval enforcement at orchestrator level)
- `src/storage`
- `src/outputs`

## Invariants

- **Coordinator only**: Orchestrator selects and delegates — it does not perform domain logic itself.
- **Never throws for missing registrations silently**: if an agent, connector, or runner is not registered, Orchestrator throws a descriptive error.
- **Connector failures propagate**: if a ConnectorResult.status is "failure", Orchestrator throws so LocalWorkflowRunner can mark the step as failed.

## Main Files

- `orchestrator.ts` — `Orchestrator` class implementing `StepExecutor`
- `index.ts` — barrel re-exports

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
5. Update this file if the public contract changes.
6. Apply bottom-up propagation: if StepExecutor interface changes, update `src/workflows/port.ts`.
