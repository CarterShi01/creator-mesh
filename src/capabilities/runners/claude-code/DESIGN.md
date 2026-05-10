# Design: src/runners/claude-code

## Current Design Summary

`src/runners/claude-code` is the first reference runner adapter for CreatorMesh. It implements `RunnerPort` using Claude Code as the backing execution engine.

Claude Code is an AI-assisted development environment that can read codebases, generate plans, write and modify files, and run verification commands. In CreatorMesh's architecture, Claude Code is treated as an interchangeable execution runner — not as the system brain or as a connector. It is one runner behind `RunnerPort`.

No implementation files exist yet. This document captures the full design for the Claude Code runner adapter.

## Design Goals

- Implement `RunnerPort` cleanly so the Claude Code adapter is swappable with Codex, OpenHands, or a human runner without changing callers.
- Expose only the RunnerPort interface; hide all Claude Code-specific invocation details inside the adapter.
- Support the MVP task types: `read`, `plan`, `write`, `test`.
- Defer `script` and `external` task types until governance and audit model are validated on safer task types.
- Make execution auditable: every task run produces an `AuditRecord`.

## What This Adapter Is

`NotionConnectorAdapter` wraps the Notion SDK behind `ConnectorPort`. Analogously, `ClaudeCodeRunnerAdapter` wraps the Claude Code execution environment behind `RunnerPort`.

The adapter:
- Receives a `RunnerAction` from the orchestrator
- Translates it into a Claude Code-specific invocation (subprocess, SDK, or local API)
- Collects the result (output text, file changes, exit status)
- Returns a `RunnerResult`
- Never throws — all errors return as `RunnerResult.status: "failure"`

## Invocation Strategy

Claude Code can be invoked in multiple ways. The correct mechanism for phase 1 is:

**Subprocess invocation (phase 1):**
- Execute `claude` CLI as a child process with `--print` flag for non-interactive output
- Pass task description as the prompt
- Pass context files via `--context` or by including file content in the prompt
- Capture stdout as `RunnerResult.stdout`
- Parse stdout for structured artifacts (file changes, test results)

**Deferred:**
- Claude Code SDK (if a programmatic API becomes stable)
- Claude Code local API / socket (if available)
- Claude Code as a remote API (if self-hosted or team-mode endpoint is supported)

The invocation mechanism is an internal detail of the adapter. `RunnerPort` callers cannot tell how Claude Code is invoked.

## Supported Task Types (MVP)

### `read`
Claude Code reads specified files and returns a summary or analysis.

- Permission: `safe-read` / approval: `never`
- Context: `files[]` (required), `workingDirectory` (optional)
- Output: text summary in `RunnerResult.stdout`
- Artifacts: none

### `plan`
Claude Code generates a plan, architecture proposal, or step-by-step implementation guide.

- Permission: `safe-read` / approval: `never`
- Context: `files[]` (optional), `constraints[]` (optional — passes AGENTS.md rules)
- Output: structured plan text in `RunnerResult.stdout`
- Artifacts: none (plan is output, not a file write)

### `write`
Claude Code creates or modifies files based on the task description.

- Permission: `write` / approval: `conditional`
- Context: `files[]` (context for the task), `workingDirectory` (required for write operations), `constraints[]` (optional)
- Output: description of changes in `RunnerResult.stdout`
- Artifacts: `RunnerResult.artifacts[]` listing each file created or modified

### `test`
Claude Code runs a verification command (e.g. `npm run verify`) and returns the output.

- Permission: `write` / approval: `conditional`
- Context: `workingDirectory` (required), `parameters.command` (required — the test/verify command to run)
- Output: command stdout in `RunnerResult.stdout`
- Artifacts: none (test run does not produce file artifacts)

## Deferred Task Types

**`script`** — execute arbitrary shell scripts. Deferred until:
- `execute` permission level governance is validated
- Sandboxing strategy is decided
- First use case (other than test running) is defined

**`external`** — open PRs, push code, send messages. Deferred until:
- `external-side-effect` governance is validated
- Audit trail completeness is proven on simpler task types
- First external workflow (e.g. open a GitHub PR from a plan) is designed

## Claude Code Context Passing

Claude Code requires context to perform meaningful tasks. The adapter translates `RunnerContext` into Claude Code invocation context:

| RunnerContext field | Claude Code usage |
|---------------------|------------------|
| `workingDirectory` | `--cwd` flag or working directory for subprocess |
| `files[]` | Passed as `--context` arguments or inlined in the prompt preamble |
| `constraints[]` | Prefixed to the prompt as system rules (e.g. "Follow these constraints: ...") |
| `parameters.command` | Used for `test` task type as the command to run |
| `parameters.maxTokens` | Optional output length limit for `read` and `plan` tasks |

Constraints sourced from AGENTS.md are the most important: they prevent Claude Code from violating architecture rules, documentation layers, or dependency boundaries during execution.

## `ClaudeCodeRunnerConfig`

Configuration injected at adapter initialization:

```
ClaudeCodeRunnerConfig {
  runnerId: "claude-code"
  executablePath?: string      // path to claude CLI; default: "claude" (PATH lookup)
  defaultWorkingDirectory?: string
  maxOutputBytes?: number      // cap on stdout capture; default: 1MB
  timeoutMs?: number           // execution timeout; default: 120000ms (2 min)
}
```

No API key is needed for local Claude Code CLI invocation. If a remote API is used in future, credentials flow through `ClaudeCodeRunnerConfig` only — never hardcoded.

## `ClaudeCodeRunnerRegistry`

MVP capabilities declared at initialization:

| ID | Task type | Permission | Approval | Async |
|----|-----------|------------|----------|-------|
| `claude-code.read` | `read` | `safe-read` | `never` | false |
| `claude-code.plan` | `plan` | `safe-read` | `never` | false |
| `claude-code.write` | `write` | `write` | `conditional` | true |
| `claude-code.test` | `test` | `write` | `conditional` | false |

`write` tasks are marked async because coding tasks may take minutes. `read`, `plan`, and `test` are synchronous for MVP.

## Error Handling

The adapter must never throw. All errors return as `RunnerResult`:

| Error condition | `status` | `error` |
|----------------|----------|---------|
| Claude Code CLI not found | `"failure"` | `"claude-code.cli.not_found"` |
| Execution timeout | `"failure"` | `"claude-code.timeout"` |
| Non-zero exit code | `"failure"` | `"claude-code.exit_error"` |
| Output parse failure | `"partial"` | `"claude-code.parse_error"` |
| Unsupported task type | `"failure"` | `"claude-code.task_type.unsupported"` |

Errors are structured codes, not raw exception messages. Callers (orchestrator, workflow) can react to specific failure modes.

## Artifact Detection

For `write` tasks, the adapter must detect which files were created or modified during execution. Strategy:

1. Before invocation: snapshot `workingDirectory` file modification times.
2. After invocation: compare snapshots to detect changed files.
3. Report each changed file as a `RunnerArtifact` in `RunnerResult.artifacts`.

For MVP, this may be simplified to: parse Claude Code stdout for file path mentions and infer operations. A full snapshot diff can be introduced when reliability requires it.

## Key Decisions

- **Subprocess invocation for phase 1.** Avoids dependency on an unstable SDK. CLI is the stable public interface of Claude Code.
- **MVP: read, plan, write, test only.** Validates the RunnerPort abstraction on safe task types before exposing higher-risk execution.
- **Adapter never throws.** Mirrors the `NotionConnectorAdapter` pattern: all errors become `RunnerResult.status: "failure"`.
- **Constraints from AGENTS.md flow into execution context.** Ensures Claude Code respects CreatorMesh architecture rules during task execution.
- **`ClaudeCodeRunnerConfig` carries all configuration.** No hardcoded paths or credentials.

## Tradeoffs

- Subprocess invocation is less efficient than an API or SDK but is the most reliable and stable option for phase 1.
- Artifact detection via stdout parsing is brittle. A snapshot diff approach is more reliable but adds complexity. Starting with stdout parsing is acceptable for MVP.
- Marking `write` tasks as async means the orchestrator must handle pending results. This is necessary because Claude Code coding tasks can take minutes on large codebases.

## Alternatives Considered

- **Claude Code SDK** — rejected for phase 1. No stable programmatic API currently exists. CLI subprocess is the reliable option.
- **Inline file content in `RunnerAction`** — rejected. Would make `RunnerAction` objects very large. File paths are sufficient; the adapter reads files as needed.
- **Sync-only for all task types** — rejected. `write` tasks on real codebases can take 2–10 minutes. Forcing synchronous blocking is impractical.

## Current Assumptions

- `claude` CLI is installed and available in PATH on the host machine.
- The first test workflow will invoke `claude-code.read` or `claude-code.plan` (safe-read, no approval needed) before attempting `claude-code.write`.
- Governance approval for `write` tasks will be demonstrated via a mock approval flow before real orchestrator integration.

## Open Questions

- **Subprocess vs. SDK**: When a stable Claude Code programmatic API becomes available, should the adapter switch? Design the subprocess adapter so the invocation mechanism can be swapped without changing `RunnerPort`.
- **Async polling**: For async `write` tasks, does the orchestrator poll on a timer, or does the adapter push a completion event? Phase 1 may use synchronous blocking even for `write` tasks and treat async as a future concern.
- **Constraint injection**: Should AGENTS.md constraints be injected by the adapter (hard-coded path) or passed in `RunnerContext.constraints[]` by the caller? Passing via context is more flexible.
- **Output size**: Claude Code can produce very large outputs. Should `maxOutputBytes` truncate, or should the adapter summarize long outputs before returning?

## Future Evolution

- Switch from subprocess to Claude Code SDK or API when a stable interface exists.
- Add `script` task type when sandboxing strategy is decided.
- Add `external` task type (open PRs, push code) when external-side-effect governance is validated.
- Register `ClaudeCodeRunnerAdapter` in a dynamic runner registry so orchestrator can select it by task type and availability.
- Add sandboxed execution mode (e.g. run inside a container) for higher-risk write and script tasks.

## ChatGPT Handoff Context

`src/runners/claude-code` has no implementation yet. Design intent:
- `ClaudeCodeRunnerAdapter` implements `RunnerPort` via subprocess invocation of `claude` CLI
- MVP task types: `read` (safe-read/never), `plan` (safe-read/never), `write` (write/conditional/async), `test` (write/conditional)
- Deferred: `script`, `external`
- `RunnerContext` carries: files, workingDirectory, constraints (from AGENTS.md), parameters
- Error taxonomy: 5 structured error codes; adapter never throws
- Artifact detection for `write` tasks via stdout parsing (MVP) or snapshot diff (future)
- `ClaudeCodeRunnerConfig`: executablePath, defaultWorkingDirectory, maxOutputBytes, timeoutMs
- Key open question: subprocess blocking vs. async for `write` tasks; polling strategy for orchestrator
