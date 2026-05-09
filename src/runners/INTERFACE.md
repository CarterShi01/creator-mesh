# Interface: src/runners

## Purpose

`runners` provides adapters for executing work through external or local execution engines. A runner is distinct from an agent: an agent reasons, a runner executes.

## Public Concepts

- `RunnerAdapter` — an interface for a specific execution engine
- `RunnerType` — an enumeration of supported execution engines (e.g. ClaudeCode, Codex, OpenHands, LocalScript, HumanRunner)
- `ExecutionRequest` — the input handed to a runner, including task description, context, and parameters
- `ExecutionResult` — the output returned by a runner after execution, including status and result payload
- `SandboxConfig` — configuration for sandboxed or isolated execution

## Inputs

`ExecutionRequest` from `src/orchestrator`, delegated after an agent or workflow determines that execution is needed.

## Outputs

`ExecutionResult` returned to `src/orchestrator`.

## Allowed Dependencies

- `src/core`
- `src/shared`

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge`
- `src/orchestrator` (runners do not call back into the orchestrator)
- `src/agents`
- `src/connectors`
- `src/workflows`
- `src/governance`
- `src/storage`
- `src/outputs`

## Invariants

- Runners must not contain agent role definitions or reasoning logic.
- Runners must not make governance decisions. Approval must happen before execution is delegated.
- Each runner adapter must implement a common interface so execution engines are interchangeable.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
