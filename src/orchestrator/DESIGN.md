# Design: src/orchestrator

## Current Design Summary

`orchestrator` is the control layer that decides what happens next. It receives normalized inputs, makes routing decisions, coordinates agents and runners, enforces approval checkpoints, and manages flow state. It delegates domain work to other layers — it does not perform agent reasoning, knowledge structuring, or external API calls itself. No implementation files exist yet.

## Design Goals

- Route `CaptureItem` inputs to the right agents, runners, and workflows based on content and context.
- Enforce approval checkpoints before delegating to runners or connectors for significant actions.
- Maintain `FlowState` so interrupted or multi-step workflows can be resumed.
- Remain a coordinator, not an executor.

## Key Decisions

- **Coordinator, not executor**: orchestrator selects which agent or runner handles a task, but does not perform the task itself. This keeps orchestrator logic stable as agents and runners are added.
- **All significant actions require `ApprovalCheckpoint`**: before delegating an `ExecutionRequest` to a runner, orchestrator must request and receive an `ApprovalResult` from `src/governance`.
- **`FlowState` for multi-step workflows**: the orchestrator persists flow state via `src/storage` so workflows can be paused, resumed, or recovered after failure.
- **`orchestrator` does not call `src/intake` or `src/connectors` directly**: it receives already-normalized inputs and delegates external calls to runners or connectors through workflows.

## Tradeoffs

- A pure coordinator model requires the orchestrator to manage all context assembly for agent and runner calls. This is verbose but makes every action observable and testable.
- Storing all flow state in `src/storage` via orchestrator adds a persistence round-trip for every state transition. For simple single-step workflows, this may be overhead. A lightweight in-memory mode for low-risk single-step flows could be a future optimization.

## Alternatives Considered

- **Orchestrator performs lightweight agent reasoning directly** — rejected. Mixing coordination logic with reasoning logic makes the orchestrator harder to test and grow.
- **Workflows coordinate themselves without an orchestrator** — rejected. Without a central coordination layer, approval checkpoints and flow state management would be duplicated in every workflow.

## Current Assumptions

- The first orchestrator behavior will be simple routing: receive a `CaptureItem` with type "thought", route it to a `ThoughtAgent`, receive the output, and persist the result.
- Approval checkpoints will initially require synchronous creator confirmation before execution proceeds.
- Flow state will be persisted as a JSON record in local storage at v1.

## Open Questions

- Should routing be a static rule table (thought → ThoughtAgent), a classifier agent, or a combination? A hybrid may be needed as the input space grows.
- How does the orchestrator handle concurrent flows — are they queued, parallelized, or serialized?
- When a runner returns a failure (`ExecutionResult` with error status), what is the retry and escalation policy?

## Future Evolution

- As agent roles and runners multiply, a routing registry or policy-driven dispatch model will replace hardcoded routing logic.
- A flow visualization layer may emerge so the creator can see the current state of in-progress workflows.
- The orchestrator may eventually support parallel branches within a workflow for tasks that can execute concurrently.

## ChatGPT Handoff Context

`src/orchestrator` has no implementation yet. Design intent: central coordinator. Receives `CaptureItem` from `src/intake`. Routes to agents, runners, or workflows. Enforces `ApprovalCheckpoint` before execution delegation. Persists `FlowState` via `src/storage`. Does not reason, does not call external APIs, does not call `src/intake` or `src/connectors` directly. First behavior target: route a thought `CaptureItem` to `ThoughtAgent`, collect result, persist. Key open question: static routing table vs. classifier-driven dispatch.
