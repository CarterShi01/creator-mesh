# Design: src/runners

## Current Design Summary

`runners` provides adapters that execute work through external or local execution engines. A runner is distinct from an agent: an agent reasons and produces recommendations; a runner carries out the execution. Claude Code is the first planned runner. No implementation files exist yet.

## Design Goals

- Define a common `RunnerAdapter` interface so execution engines are interchangeable.
- Isolate all tool-specific execution logic inside the runner adapter, not in agents or orchestrator.
- Support multiple execution environments: coding agents, local scripts, manual human steps.

## Key Decisions

- **Adapter pattern**: each execution engine implements `RunnerAdapter`. The orchestrator calls `RunnerAdapter.execute(ExecutionRequest)` without knowing which engine is underneath.
- **Governance pre-approved before execution**: the orchestrator must obtain approval from `src/governance` before delegating an `ExecutionRequest` to a runner. Runners do not perform governance checks.
- **`ExecutionResult` carries status and payload**: success, failure, and partial results are all valid outcomes. The orchestrator interprets the result.

## Tradeoffs

- Hiding all engine-specific logic inside adapters means runner adapters will be complex. Each adapter must translate the generic `ExecutionRequest` into the engine's specific API or CLI format.
- A common `RunnerAdapter` interface may not express every capability of every engine. Some engines (e.g., Claude Code) support richer context passing than a simple task string. The interface must be designed to allow per-adapter extensions without breaking the common contract.

## Alternatives Considered

- **Agents invoke runners directly** — rejected. Agents are reasoning roles; execution is a separate concern. Direct agent-to-runner coupling would violate the layer boundary.
- **Runners embed governance logic** — rejected. Governance decisions must be centralized and auditable. Distributing them across runner adapters would make the approval model untrustworthy.

## Current Assumptions

- Claude Code is the first runner to design and implement.
- The `ExecutionRequest` for Claude Code will include: task description, context files, and execution parameters.
- The first use case is a coding task triggered by a workflow, reviewed by the creator, then executed via Claude Code.

## Open Questions

- How does the Claude Code runner communicate with Claude Code in practice — subprocess call, API, socket, or Claude Code SDK?
- Should runner execution be synchronous (wait for result) or asynchronous (poll or callback)? Long-running coding tasks suggest async.
- How are partial or streaming execution results handled — is `ExecutionResult` always terminal, or can it carry intermediate updates?
- How is a `HumanRunner` represented — is it a prompt to the creator, or a placeholder that pauses the workflow until manual confirmation?

## Future Evolution

- Additional runners: Codex, OpenHands, Aider, local script, human runner.
- A runner registry may emerge for dynamic selection based on task type and availability.
- Sandboxed execution may require a `SandboxConfig` per runner to isolate side effects.

## ChatGPT Handoff Context

`src/runners` has no implementation yet. Design intent: adapter pattern for execution engines. Common `RunnerAdapter` interface. Governance approval must happen before execution is delegated. First implementation target: Claude Code runner. Key open question: sync vs. async execution model for long-running tasks. Runners must not contain agent logic or governance decisions.
