# Interface: src/workflows

## Purpose

`workflows` defines end-to-end flows that transform inputs into outputs. A workflow composes triggers, intake, knowledge, agents, runners, connectors, governance, and outputs into a coherent process that delivers value to the creator.

## Public Concepts

- `WorkflowDefinition` — a named, versioned description of an end-to-end flow including steps, inputs, outputs, and governance checkpoints
- `WorkflowStep` — a single unit within a workflow, referencing an agent role, runner, connector, or knowledge operation
- `WorkflowInput` — the data a workflow receives when it starts
- `WorkflowOutput` — the result a workflow produces when it completes
- `WorkflowRun` — a record of a specific execution of a workflow, including state, step history, and result

Possible future workflows:
- `ThoughtToNoteWorkflow`
- `MessageToActionWorkflow`
- `IdeaToProjectPlanWorkflow`
- `WeeklyReviewWorkflow`
- `CognitiveTreeWorkflow`

## Inputs

- `CaptureItem` or dispatch signal from `src/orchestrator`
- `KnowledgeItem` from `src/knowledge`
- `AgentOutput` from `src/agents`
- `ExecutionResult` from `src/runners`
- `ReadResult` from `src/connectors`
- `ApprovalResult` from `src/governance`

## Outputs

- `WorkflowOutput` to `src/outputs`
- State updates to `src/storage`
- `ApprovalRequest` to `src/governance` when a checkpoint is reached

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

- Workflows must define explicit human approval checkpoints for actions that affect external systems or personal data.
- Workflow definitions must be readable and auditable without executing code.
- Workflows must not contain connector-specific API logic. External calls belong in `src/connectors`.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
