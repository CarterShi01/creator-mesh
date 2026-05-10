# Runtime

`src/runtime` owns CreatorMesh's execution runtime. It receives already-framed execution work from workflows and creation-facing flows, dispatches steps to agents, runners, and connectors, applies governance checks before side effects, supports pause/resume behavior, and records execution state through runtime/workflow structures. It does not own the CreatorMesh worldview or methodological core; `src/creation` does.

## What belongs here

- Step dispatch logic (agent steps, connector steps, runner steps)
- Input mapping resolution (`$input.*`, `$steps.*.*`)
- Governance enforcement before side-effecting steps
- Pause/resume coordination via `human-review` step handling in `LocalWorkflowRunner`
- Execution state transitions

## What does not belong here

- Tool-specific API code
- Low-level storage code
- Large prompt libraries
- Direct UI code
- Domain models or worldview logic (those belong in `src/creation`)
- Methodological reasoning (quest framing, object construction, relation mapping)

## Role in the architecture

`runtime` is the execution loop layer. It runs the system safely by dispatching work to the right agents, runners, and connectors, checking governance before side effects, and supporting human review checkpoints.

A clear distinction:

- `creation` is the methodological core — it understands intent, frames quests, constructs objects, and tracks artifacts.
- `runtime` is execution infrastructure — it dispatches framed work and enforces safety policies.
- `governance` provides policies — `runtime` invokes governance before executing side effects.
- `workflows` defines stable routines — `runtime` executes the steps those routines describe.

## Deferred / Not Yet Implemented

The following capabilities are part of the future runtime vision but are **intentionally not implemented in this module yet**:

- Runtime session manager
- Runtime context builder
- LLM loop abstraction
- Tool invocation gateway beyond existing step dispatch
- Context compression
- Runtime event log / JSONL-like persistent trace
- Long-running run recovery
- Cross-surface session continuity

These will be added in future tasks as the architecture matures.
