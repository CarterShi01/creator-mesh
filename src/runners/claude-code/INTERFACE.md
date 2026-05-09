# Interface: src/runners/claude-code

## Purpose

`runners/claude-code` is the first reference runner adapter for CreatorMesh. It implements `RunnerPort` using Claude Code as the backing execution engine.

Claude Code is treated as an interchangeable execution runner — not as the system brain or a connector. All callers interact with `RunnerPort`, not with this adapter directly.

## Public Concepts

### Adapter

**`ClaudeCodeRunnerAdapter`**
Implements `RunnerPort`. All callers use the `RunnerPort` interface; this class is the concrete implementation.

```
ClaudeCodeRunnerAdapter implements RunnerPort {
  runnerId: "claude-code"
  registry(): ClaudeCodeRunnerRegistry
  execute(action: RunnerAction): Promise<RunnerResult>
}
```

### Registry

**`ClaudeCodeRunnerRegistry`**
Implements `RunnerRegistry`. Declared at initialization with MVP capabilities.

```
ClaudeCodeRunnerRegistry implements RunnerRegistry {
  runnerId: "claude-code"
  capabilities: RunnerCapability[]      // see MVP Capabilities table below
  supports(taskType: RunnerTaskType): boolean
  get(taskType: RunnerTaskType): RunnerCapability | undefined
}
```

### Configuration

**`ClaudeCodeRunnerConfig`**
Injected at adapter initialization. Extends `RunnerConfig`.

```
ClaudeCodeRunnerConfig {
  runnerId: "claude-code"
  executablePath?: string           // path to claude CLI; defaults to "claude" (PATH lookup)
  defaultWorkingDirectory?: string  // fallback when RunnerAction.context.workingDirectory is absent
  maxOutputBytes?: number           // stdout capture cap; default: 1_048_576 (1MB)
  timeoutMs?: number                // execution timeout; default: 120_000ms (2 min)
}
```

## MVP Capabilities

| ID | Task Type | Permission Level | Approval | Async |
|----|-----------|-----------------|----------|-------|
| `claude-code.read` | `"read"` | `"safe-read"` | `"never"` | false |
| `claude-code.plan` | `"plan"` | `"safe-read"` | `"never"` | false |
| `claude-code.write` | `"write"` | `"write"` | `"conditional"` | true |
| `claude-code.test` | `"test"` | `"write"` | `"conditional"` | false |

Deferred capabilities (not declared in MVP registry):
- `claude-code.script` — `"script"` / `"execute"` / `"always"`
- `claude-code.external` — `"external"` / `"external-side-effect"` / `"always"`

## RunnerContext Usage

The adapter translates `RunnerContext` fields into Claude Code invocation parameters:

| `RunnerContext` field | Claude Code usage |
|----------------------|------------------|
| `workingDirectory` | Working directory for subprocess execution |
| `files[]` | Passed as context (via `--context` flag or prompt preamble) |
| `constraints[]` | Prefixed to the prompt as system rules |
| `parameters.command` | Command to run for `"test"` task type |
| `parameters.maxTokens` | Optional output length limit |

## Error Codes

The adapter never throws. All errors are returned as `RunnerResult.status: "failure"` with a structured error code.

| Code | Condition |
|------|-----------|
| `claude-code.cli.not_found` | `claude` executable not found in PATH or configured path |
| `claude-code.timeout` | Execution exceeded `timeoutMs` |
| `claude-code.exit_error` | Claude Code CLI returned a non-zero exit code |
| `claude-code.parse_error` | Could not parse stdout into expected output shape |
| `claude-code.task_type.unsupported` | `RunnerAction.taskType` is not in the MVP registry |

## Outputs

`RunnerResult` fields populated by this adapter:

| Field | Description |
|-------|-------------|
| `runnerId` | Always `"claude-code"` |
| `runId` | UUID generated at execution start |
| `status` | `"success"` / `"failure"` / `"partial"` / `"pending"` (async write) |
| `stdout` | Raw text output from Claude Code CLI |
| `artifacts` | Files created or modified (`"write"` task type only) |
| `error` | Structured error code on failure |
| `startedAt` / `completedAt` | Execution timestamps |
| `auditId` | UUID referencing the `AuditRecord` persisted by `src/governance` |

## Allowed Dependencies

- `src/core`
- `src/shared`
- Node.js `child_process` (for subprocess invocation)
- Node.js `fs` (for artifact detection via file snapshot)

## Disallowed Dependencies

- All other `src/*` modules
- Any external SDK or library not listed above
- No direct dependency on `@anthropic-ai/sdk` — the adapter invokes the `claude` CLI, not the API

## Invariants

- **Adapter never throws.** All errors become `RunnerResult.status: "failure"` with a structured error code.
- **No credentials in `RunnerAction` or `RunnerResult`.** Configuration flows through `ClaudeCodeRunnerConfig` only.
- **Callers use `RunnerPort` only.** No caller imports `ClaudeCodeRunnerAdapter` directly.
- **Capabilities are declared at initialization.** The registry does not change after construction.
- **Constraints from AGENTS.md must be passed via `RunnerContext.constraints[]` before any `write` task executes.** Ensures architecture rules are respected during code generation.

## Main Files

Implementation files (MVP):

- `adapter.ts` — `ClaudeCodeRunnerAdapter` implementing `RunnerPort`
- `registry.ts` — `ClaudeCodeRunnerRegistry` with MVP capabilities
- `invoke.ts` — `SubprocessInvoker` interface + `ChildProcessInvoker` implementation (injectable for testability)
- `errors.ts` — `ClaudeCodeErrorCode` type and `classifyInvokeError()` function
- `index.ts` — barrel re-exports: `ClaudeCodeRunnerAdapter`, `ClaudeCodeRunnerRegistry`, `ChildProcessInvoker`, `classifyInvokeError`

Deferred files (not in MVP):
- `artifacts.ts` — artifact detection logic via file snapshot diffing

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `src/runners/DESIGN.md` and `src/runners/INTERFACE.md` (parent port design).
4. Read `src/runners/claude-code/DESIGN.md`.
5. Read this `INTERFACE.md`.
6. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
7. Update this file if the public contract changes.
8. Apply bottom-up propagation: check whether `src/runners/INTERFACE.md`, `src/runners/DESIGN.md`, or `src/orchestrator` need corresponding updates.
