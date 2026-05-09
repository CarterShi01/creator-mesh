# Interface: src/orchestrator

## Purpose

`orchestrator` is the control layer of CreatorMesh. It decides what should happen next after an input is received and normalized. It coordinates agents, runners, workflows, and governance checkpoints without performing domain work directly.

## Public Concepts

- `DispatchDecision` — a routing decision that determines which agent, runner, or workflow handles a capture item
- `FlowState` — the current state of an in-progress flow, including step, status, and history
- `ApprovalCheckpoint` — a pause point where human review is required before proceeding
- `AgentSelection` — the choice of which agent role should handle a given task
- `RunnerSelection` — the choice of which execution engine should carry out a given task

## Inputs

- `CaptureItem` from `src/intake`
- `KnowledgeItem` from `src/knowledge`
- `ApprovalResult` from `src/governance`
- `AgentOutput` from `src/agents`
- `ExecutionResult` from `src/runners`

## Outputs

- `AgentTask` to `src/agents`
- `RunnerTask` to `src/runners`
- `WorkflowRun` coordination signals to `src/workflows`
- `ApprovalRequest` to `src/governance`
- State updates to `src/storage`

## Allowed Dependencies

- `src/core`
- `src/shared`
- `src/governance` (to request and receive approvals)
- `src/storage` (to persist flow state)

## Disallowed Dependencies

- `src/triggers` (orchestrator does not handle raw input signals)
- `src/intake` (orchestrator receives normalized items, not raw payloads)
- `src/connectors` (external tool calls are delegated to runners or connectors)
- `src/outputs` (output formatting is not an orchestrator concern)

## Invariants

- `orchestrator` must coordinate, not execute. It selects agents and runners but does not perform their work.
- `orchestrator` must not contain domain knowledge logic or tool-specific integration code.
- Every significant action that could affect the creator's data or external systems must pass through an `ApprovalCheckpoint` before execution.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
