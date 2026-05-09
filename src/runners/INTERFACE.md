# Interface: src/runners

## Purpose

`runners` provides the execution boundary of CreatorMesh. All task execution passes through this layer via **RunnerPort** — a normalized execution interface that decouples the rest of the system from specific execution engines, tools, and runtimes.

## Public Concepts

### Core Port and Registry

**`RunnerPort`**
The standard interface every runner adapter must implement. Callers in `src/orchestrator` and `src/workflows` interact only with this interface — never with a specific adapter.

```
RunnerPort {
  runnerId: string
  registry(): RunnerRegistry
  execute(action: RunnerAction): Promise<RunnerResult>
}
```

**`RunnerRegistry`**
Declares which task types a runner supports. Built at runner initialization time.

```
RunnerRegistry {
  runnerId: string
  capabilities: RunnerCapability[]
  supports(taskType: RunnerTaskType): boolean
  get(taskType: RunnerTaskType): RunnerCapability | undefined
}
```

**`RunnerCapability`**
A single declared capability of a runner.

```
RunnerCapability {
  id: string                             // unique within this runner
  taskType: RunnerTaskType
  permissionLevel: RunnerPermissionLevel
  approvalRequirement: ApprovalRequirement
  async: boolean                         // true if this task type may be long-running
  description: string
}
```

### Type Enumerations

**`RunnerTaskType`**
```
"read"       // read files, inspect codebase — no side effects
| "plan"     // generate plans or architectures — no side effects
| "write"    // create or modify local files
| "test"     // run test suites or verification commands
| "script"   // execute shell scripts or commands
| "external" // open PRs, push code, send messages — external side effect
| "human"    // manual creator action — workflow pauses until confirmed
```

**`RunnerPermissionLevel`**
```
"safe-read"              // read-only, no writes or side effects — auto-approved
| "write"                // creates or modifies local files — conditional approval
| "execute"              // runs scripts or commands with local side effects — always requires approval
| "external-side-effect" // any action visible externally — always requires approval
| "human"                // workflow blocks until creator manually confirms
```

**`ApprovalRequirement`**
```
"never"         // auto-approved; no human review needed
| "conditional"  // approval required based on scope or governance policy
| "always"       // every invocation requires explicit creator approval
```

### Context

**`RunnerContext`**
Contextual information passed alongside the task description.

```
RunnerContext {
  workingDirectory?: string               // base path for file operations
  files?: string[]                        // file paths to include as execution context
  constraints?: string[]                  // rules or restrictions the runner must respect
  parameters?: Record<string, unknown>    // runner-specific settings
}
```

### Action and Result

**`RunnerAction`**
The structured record of a requested runner execution. Created by the orchestrator or workflow before calling `RunnerPort.execute()`.

```
RunnerAction {
  runnerId: string
  taskType: RunnerTaskType
  taskDescription: string                 // human-readable description of the task
  context?: RunnerContext
  requestedAt: Date
  approvalResult?: "approved" | "rejected" | "auto-approved"
  status: "pending" | "approved" | "executing" | "completed" | "failed" | "rejected"
  runId?: string                          // assigned when async execution starts
}
```

**`RunnerResult`**
The structured outcome of a runner execution.

```
RunnerResult {
  runnerId: string
  action: RunnerAction
  runId: string
  status: "success" | "failure" | "partial" | "pending"
  output?: unknown                        // structured output; shape varies by runner and task type
  stdout?: string                         // raw text output from the runner
  artifacts?: RunnerArtifact[]            // files created or modified during execution
  error?: string
  startedAt?: Date
  completedAt?: Date
  auditId: string                         // UUID of the AuditRecord persisted by src/governance
}
```

**`RunnerArtifact`**
A file created or modified by the runner during execution.

```
RunnerArtifact {
  path: string           // absolute or working-directory-relative path
  operation: "created" | "modified" | "deleted"
}
```

### Configuration

**`RunnerConfig`**
Injected at runner initialization. Contains credentials, executable paths, and per-runner settings. Raw secrets are never stored in `RunnerAction` or `RunnerResult`.

```
RunnerConfig {
  runnerId: string
  [key: string]: unknown    // runner-specific fields
}
```

## Inputs

- `RunnerAction` from `src/orchestrator` or `src/workflows`
- `RunnerConfig` injected at initialization (from environment or secure config)

## Outputs

- `RunnerResult` returned to `src/orchestrator` or `src/workflows`
- `AuditRecord` (via `src/governance`) — produced for every `execute()` call

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
- `src/governance` (runners do not call governance directly — the orchestrator handles approval before calling execute)
- `src/storage`
- `src/outputs`

## Invariants

- **All callers use `RunnerPort`** — no caller imports a specific adapter class.
- **Every `execute()` call produces an audit record** — the `auditId` in `RunnerResult` must reference a persisted `AuditRecord`.
- **Approval is decided before `execute()` is called** — `RunnerAction.approvalResult` must be set by the orchestrator before the port is invoked. The port records the decision; it does not make it.
- **Credentials flow through `RunnerConfig` only** — no raw secrets appear in `RunnerAction`, `RunnerResult`, or any log.
- **Each runner implements a common port** — adapters are interchangeable from the caller's perspective.
- **Runners must not contain agent logic or governance decisions.** Reasoning belongs in `src/agents`; approval decisions belong in `src/governance`.

## Runner Backend Types

Four backend types implement `RunnerPort`:

1. **Coding agent adapter** — wraps a coding agent CLI or API (e.g. Claude Code, Codex, OpenHands, Aider)
2. **Local script adapter** — wraps shell commands or local tool execution
3. **Human runner** — produces a prompt, pauses workflow, awaits creator manual confirmation
4. **Agent framework adapter** — wraps Mastra, LangGraph, or similar frameworks (future)

All four backend types implement `RunnerPort`. The backend type is an internal implementation detail of the adapter.

## Main Files

No implementation files exist yet.

Planned file structure:

- `port.ts` — `RunnerPort`, `RunnerRegistry`, `RunnerCapability`, `RunnerAction`, `RunnerResult`, `RunnerArtifact`, `RunnerConfig` interfaces
- `types.ts` — `RunnerTaskType`, `RunnerPermissionLevel`, `ApprovalRequirement` enumerations
- `index.ts` — barrel re-exports
- `claude-code/` — Claude Code runner adapter (first reference runner); see `claude-code/INTERFACE.md`

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `DESIGN.md` — the full RunnerPort and RunnerRegistry design.
4. Read this `INTERFACE.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
7. Apply bottom-up propagation: check whether `src/orchestrator` or `src/workflows` INTERFACE.md or DESIGN.md needs a corresponding update.
