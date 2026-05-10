# Design: src/runtime

## Current Design Summary

`runtime` is the execution loop layer of CreatorMesh. It receives already-framed execution work, dispatches steps to agents, runners, and connectors, enforces governance checks before side-effecting operations, and supports pause/resume behavior through human review integration. It delegates domain work to other layers — it does not perform agent reasoning, knowledge structuring, or external API calls itself.

This module was formerly named `src/orchestrator`. The rename reflects a realigned product model where `creation` owns the methodological core (worldview, intent framing, quest construction) and `runtime` owns execution infrastructure (dispatch, governance enforcement, step sequencing).

## Design Goals

- Dispatch `AgentStep`, `ConnectorStep`, and `RunnerStep` to the correct registered adapter.
- Enforce governance policies before any side-effecting step.
- Support pause/resume via `human-review` step outputs.
- Remain an execution infrastructure layer, not a domain/worldview layer.
- Accept registries of agents, connectors, and runners at construction for clean dependency injection.

## Key Decisions

- **Execution infrastructure, not worldview**: `runtime` selects which agent/runner/connector handles a step, but does not perform domain reasoning. This keeps runtime logic stable as agents and runners multiply.
- **All significant actions require governance check**: before delegating a `ConnectorStep` or `RunnerStep` to its adapter, `Runtime` evaluates the capability's permission level via an optional `GovernanceEvaluator`. A `denied` or `requires-approval` decision throws before `execute()` is called — the adapter never receives the request.
- **Governance is backward-compatible**: the `GovernanceEvaluator` is an optional 4th constructor parameter. Callers that omit it receive unchanged behavior.
- **`Runtime` does not call `src/intake` or `src/connectors` directly**: it receives already-normalized inputs and delegates external calls to connectors/runners.
- **`_hasAcceptedHumanReview()`**: reads `stepOutputs` for `{ decision: "accept" }` entries, enabling auto-approval of `write`/`execute`/`external-side-effect` capabilities that follow a completed human review step.

## Tradeoffs

- A pure delegation model requires runtime to assemble all context for agent/runner calls. This is verbose but makes every execution step observable and testable.
- Storing flow state in `src/storage` via workflow runner adds a persistence round-trip for each state transition. For low-risk single-step workflows this may be overhead. A lightweight in-memory mode is a future optimization.

## Alternatives Considered

- **Runtime performs lightweight domain reasoning directly** — rejected. Mixing execution with domain logic makes runtime harder to test and grow.
- **Workflows self-coordinate without a runtime executor** — rejected. Without a central executor, governance checks and step dispatch would be duplicated in every workflow.

## Current Assumptions

- The first runtime behavior is step-level dispatch: receive a `WorkflowStep`, resolve input mappings, call the adapter, return output.
- Governance evaluation is synchronous; no async approval flows yet.
- Pause/resume is handled by `LocalWorkflowRunner` via `human-review` step results — runtime reads those results but does not manage session state itself.

## Open Questions

- Should routing be extended to support parallel step branches within a single workflow execution?
- When a runner returns failure, what is the retry and escalation policy?
- How does runtime handle concurrent workflow runs — queued, parallelized, or serialized?

## Future Evolution

- As agent roles and runners multiply, a routing registry or policy-driven dispatch model may replace the current switch-based dispatch.
- A flow visualization layer may emerge so the creator can see current in-progress workflow state.
- Runtime may support parallel branches within a workflow for tasks that can execute concurrently.

## Deferred / Not Yet Implemented

The following are part of the **future runtime vision** but are **intentionally not implemented in this task**:

- **Runtime session manager**: tracks active sessions across surfaces and tools.
- **Runtime context builder**: assembles context windows for LLM calls from current session and prior state.
- **LLM loop abstraction**: wraps iterative agent/tool-call cycles as a first-class runtime primitive.
- **Tool invocation gateway**: extends current step dispatch to a broader tool invocation contract.
- **Context compression**: summarizes long-running context to fit within LLM limits.
- **Runtime event log / JSONL-like persistent trace**: emits a structured event stream for every execution step.
- **Long-running run recovery**: restores an interrupted workflow run from persisted state.
- **Cross-surface session continuity**: maintains consistent runtime state across CLI, web, and mobile surfaces.

These will be added in future tasks. Do not implement them as part of the `src/orchestrator → src/runtime` rename.

## ChatGPT Handoff Context

`src/runtime` is the execution loop layer. It dispatches `AgentStep`, `ConnectorStep`, and `RunnerStep` to registered adapters. It enforces governance checks (via optional `GovernanceEvaluator`) before side-effecting steps. It does not own domain reasoning or worldview logic — `src/creation` does. Key invariant: governance is checked before every connector/runner step; adapters never execute when governance denies or requires approval without prior human acceptance.
