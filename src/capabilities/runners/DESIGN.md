# Design: src/runners

## Current Design Summary

`src/runners` is the execution boundary of CreatorMesh. All task execution passes through this layer via **RunnerPort** — a normalized execution interface that decouples the rest of the system from specific execution engines, tools, and runtimes.

The runner model has three core components:

1. **RunnerPort** — the standard interface every runner adapter must implement
2. **RunnerRegistry** — declares which task types a runner supports, at what permission level, and under what approval conditions
3. **RunnerAction** — the structured record of every execution request, which flows into the audit trail via `src/governance`

Claude Code is the first reference runner. Its design will validate RunnerPort before any other runner is designed or built.

## Design Goals

- Decouple the rest of the system from specific execution engines. Internal layers depend on normalized task execution, not Claude Code CLI calls or subprocess commands.
- Make runners interchangeable. Swapping Claude Code for another coding engine should not require changes in orchestrator, workflows, or agents.
- Make every execution side effect visible, approvable, and auditable by default.
- Support sync and async execution without changing the port interface.
- Support multiple runner types: coding agents, local scripts, human runners, and future execution environments.

## What a Runner Is

In CreatorMesh's model, a runner is an **execution engine adapter**.

It is not a reasoning role. It is not a connector. It is not a workflow.

A runner:

- Declares which task types it supports via `RunnerRegistry`
- Receives a `RunnerAction` from the caller (orchestrator or workflow)
- Executes the task through its backing engine
- Returns a `RunnerResult`
- Produces an audit record for every execution, regardless of success or failure

A runner does not decide what to execute — that is the orchestrator's and agent's job. It only carries out what it is asked to do, within its declared task types.

## RunnerPort

`RunnerPort` is the standard interface that every runner adapter must implement.

```
RunnerPort {
  runnerId: string
  registry(): RunnerRegistry
  execute(action: RunnerAction): Promise<RunnerResult>
}
```

`runnerId` identifies the runner (e.g. `"claude-code"`, `"local-script"`, `"human"`, `"codex"`).

`registry()` returns the runner's declared task registry. The caller uses this to check whether the runner supports a given task type before issuing a `RunnerAction`.

`execute()` is the single entry point for all execution requests. The runner interprets the `RunnerAction` (including its task type and context) and performs the corresponding engine-specific operation.

All callers (orchestrator, workflows) interact with `RunnerPort`, never with a specific adapter class or CLI wrapper.

## RunnerRegistry

Each runner declares its supported task types at initialization time. The registry answers two questions:

- Does this runner support this task type?
- What are the permission level and approval rules for this task type?

A `RunnerCapability` has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique capability identifier within this runner |
| `taskType` | RunnerTaskType | One of the standard runner task types |
| `permissionLevel` | RunnerPermissionLevel | The risk classification of this task type |
| `approvalRequirement` | ApprovalRequirement | When human approval is required |
| `async` | boolean | Whether this task type executes asynchronously |
| `description` | string | Human-readable description for audit and review display |

## Standard Runner Task Types

CreatorMesh defines seven standard runner task types. Every runner maps its engine-specific operations onto these types.

| Type | Meaning | Default permission | Default approval |
|------|---------|-------------------|-----------------|
| `read` | Read files, inspect codebase, search content — no writes | `safe-read` | `never` |
| `plan` | Generate plans, architectures, or outlines — no side effects | `safe-read` | `never` |
| `write` | Create or modify local files | `write` | `conditional` |
| `test` | Run test suites or verification commands | `write` | `conditional` |
| `script` | Execute shell scripts or commands | `execute` | `always` |
| `external` | Open PRs, push code, send messages, or any external side effect | `external-side-effect` | `always` |
| `human` | Manual human execution — pauses workflow until creator confirms | `human` | `always` |

"Default" means the baseline before context or governance policy adjusts it. Governance may elevate or relax defaults based on configured policies.

## Permission Levels

Permission levels classify the risk and reversibility of a runner task type.

| Level | Meaning | Auto-approved? |
|-------|---------|---------------|
| `safe-read` | Read-only, no file writes or side effects | Yes |
| `write` | Creates or modifies local files; generally reversible | Conditional |
| `execute` | Runs scripts or commands with local side effects | Never — always requires explicit approval |
| `external-side-effect` | Any action visible externally (PRs, pushes, messages) | Never — always requires explicit approval |
| `human` | Pauses workflow; requires creator manual action to resume | Always — workflow blocks until creator acts |

## Approval Requirements

Each runner capability declares when human approval is required. Approval model mirrors `src/connectors`:

| Requirement | Meaning |
|-------------|---------|
| `never` | Auto-approved; no human intervention needed |
| `conditional` | Approval required when the task affects a large scope or is flagged by governance policy |
| `always` | Every invocation requires explicit creator approval before execution |

The orchestrator checks the capability's `approvalRequirement` before issuing a `RunnerAction`. If approval is required, it requests an `ApprovalResult` from `src/governance` before calling `RunnerPort.execute()`.

## RunnerAction and Audit Trail

Every call to `RunnerPort.execute()` is represented as a `RunnerAction`. The action record:

- Identifies the runner and task type
- Carries a human-readable task description
- Includes a `RunnerContext` with files, working directory, and parameters the runner needs
- Records the approval result before execution
- Records the final status (completed, failed, rejected)
- Carries a `runId` for async execution tracking

After execution, the runner returns a `RunnerResult` that includes an `auditId`. This ID links the result back to the `AuditRecord` that `src/governance` persists via `src/storage`.

The audit trail is append-only. Every runner action — including rejected, failed, and auto-approved actions — has a record.

## RunnerContext

The context passed to a runner alongside the task description. Different runners use different fields.

```
RunnerContext {
  workingDirectory?: string     // base path for file operations
  files?: string[]              // file paths to include as context
  constraints?: string[]        // rules or restrictions the runner must respect
  parameters?: Record<string, unknown>  // runner-specific settings
}
```

For Claude Code: `files` provides relevant source paths; `constraints` carries CLAUDE.md rules or scope limits.

For LocalScript: `workingDirectory` and `parameters` are primary; `files` is optional context.

For HumanRunner: all fields are optional — the task description and approval record are the primary artifacts.

## Sync vs Async Execution

Runner task types fall into two execution patterns:

**Synchronous** — result is available when `execute()` resolves:
- `read`, `plan` — generally fast; result is text output
- `test` — command completes within a bounded time window

**Asynchronous** — execution begins when `execute()` resolves, but the result arrives later:
- `script`, `write`, `external` on long-running engines
- Claude Code multi-step coding tasks may take minutes

`RunnerResult` carries a `status` field:
- `"pending"` — async execution started; poll via `runId`
- `"success"` — completed; output available
- `"failure"` — failed; error available
- `"partial"` — partial output; more results pending

The orchestrator is responsible for polling or receiving callbacks on async runner results. The runner adapter decides internally whether to block or return immediately.

## HumanRunner

`HumanRunner` is a special runner type that represents a task the creator must perform manually.

When a workflow step is delegated to `HumanRunner`:
1. The orchestrator issues a `RunnerAction` with `taskType: "human"`
2. The runner adapter generates a human-readable prompt describing the task
3. The workflow pauses — `RunnerResult.status` is `"pending"`
4. The creator performs the task and confirms completion (outside the system boundary)
5. The orchestrator resumes the workflow with a `RunnerResult.status: "success"` or `"failure"`

`HumanRunner` serves as a fallback for any task not yet automated and as an explicit governance mechanism for irreversible decisions.

## Runner Backend Types

A `RunnerPort` adapter may be backed by:

1. **Coding agent adapter** — wraps a coding agent CLI or API (e.g. Claude Code, Codex, OpenHands, Aider)
2. **Local script adapter** — wraps shell commands or local tool execution
3. **Human runner** — produces a prompt, pauses workflow, awaits creator confirmation
4. **Agent framework adapter** — wraps Mastra, LangGraph, or similar frameworks as execution backends (future)

All backend types implement the same `RunnerPort` interface. The caller cannot tell which backend type is in use.

## Claude Code Runner (Reference)

Claude Code is the first reference runner.

It validates the RunnerPort abstraction before any other runner is designed or built.

Supported task types (MVP): `read`, `plan`, `write`, `test`.
Deferred: `script`, `external`.

Claude Code runner context includes:
- Files and directories to provide as context
- AGENTS.md constraints to pass to the runner
- Working directory for file operations

See `src/runners/claude-code/DESIGN.md` and `src/runners/claude-code/INTERFACE.md` for the full design.

## Key Decisions

- **RunnerPort is the only interface callers depend on.** No caller in orchestrator or workflows should import a specific runner adapter class.
- **Capabilities are declared, not discovered at runtime.** The registry is built when the runner is initialized.
- **Every execution is audited, including auto-approved and failed ones.** An empty audit trail is not acceptable.
- **Claude Code is a reference runner, not the port design center.** The task type model was designed for all runners; Claude Code is the first example.
- **The port does not own approval decisions.** The orchestrator requests approval from governance before calling `execute()`. The port only records the approval result.
- **RunnerPort mirrors ConnectorPort in governance model.** Same permission level and approval requirement pattern. Different domain: execution vs. external data access.

## Tradeoffs

- A single `execute(RunnerAction)` entry point is simple and uniform but requires the runner to do internal dispatch based on `taskType`. Each adapter will have conditional logic. This is preferable to a multi-method interface that leaks task types into the port signature.
- Async execution introduces complexity: the orchestrator must handle pending results and polling. The alternative (forcing all runners to be synchronous) would block long-running coding tasks and make the system feel slow.
- `RunnerContext.files` is a list of paths, not file content. The runner adapter is responsible for reading files. This keeps `RunnerAction` small but requires the adapter to have filesystem access.

## Alternatives Considered

- **Multi-method RunnerPort (separate `read()`, `write()`, `execute()` methods)** — rejected. Would add methods for every new task type. Single `execute()` with typed actions is more extensible and mirrors the proven ConnectorPort pattern.
- **Agents invoke runners directly** — rejected. Agents are reasoning roles; execution is a separate concern. Agent-to-runner coupling would violate the layer boundary.
- **Runners embed governance logic** — rejected. Governance decisions must be centralized. Distributing them across runner adapters would make the approval model untrustworthy.
- **Async-only interface** — rejected for phase 1. Short-lived tasks (read, plan) should return immediately. Forcing async for all tasks adds unnecessary complexity before it is needed.

## Current Assumptions

- Claude Code is the first runner to design and implement.
- `RunnerAction` for Claude Code will include: task description, relevant file paths, working directory, and constraints from AGENTS.md.
- The first use case is a coding task triggered by a workflow, reviewed by the creator, then executed via Claude Code.
- Claude Code runner uses subprocess invocation or Claude Code SDK — the exact mechanism is an open question for the adapter design.

## Open Questions

- How does the Claude Code runner communicate with Claude Code in practice — subprocess call, Claude Code SDK, or local API?
- For async runners: does the orchestrator poll on a timer, or does the runner push a callback when complete?
- How are partial or streaming execution results handled — is `RunnerResult` always terminal, or can it carry intermediate updates?
- Should `RunnerContext.files` carry file content inline (for small tasks) or only file paths (requiring the adapter to read them)?
- When multiple runners support the same task type, how does the orchestrator select one — static config, capability registry lookup, or runtime preference?

## Future Evolution

- Additional runners: Codex, OpenHands, Aider, local script runner, human runner.
- A runner registry may emerge for dynamic runner selection based on task type, availability, and cost.
- Sandboxed execution may require a `SandboxConfig` per runner to isolate side effects from the host system.
- Agent framework adapters (Mastra, LangGraph) as runner backends for multi-step agent graph execution.

## ChatGPT Handoff Context

`src/runners` has no implementation yet. The design defines:
- `RunnerPort` — single `execute(RunnerAction): Promise<RunnerResult>` entry point + `registry(): RunnerRegistry`
- `RunnerRegistry` — declared at init; 7 standard task types (read/plan/write/test/script/external/human)
- Permission levels: `safe-read` (auto), `write` (conditional), `execute` (always approve), `external-side-effect` (always approve), `human` (always/blocks workflow)
- Every execution produces an `AuditRecord` via governance
- Approval is decided by the orchestrator before calling `execute()` — the port only records the result
- Sync vs async: `RunnerResult.status: "pending"` for async; orchestrator polls or receives callback
- HumanRunner: pauses workflow until creator manual confirmation
- Claude Code is the first reference runner; MVP task types: read, plan, write, test
- Mirrors ConnectorPort governance pattern — same approval model, different domain
