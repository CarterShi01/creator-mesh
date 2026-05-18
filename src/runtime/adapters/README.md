# adapters/

Shell adapter that wraps Phase 1 dispatch scripts safely via `child_process.execFile`.

- `shell-controller-adapter.ts` — `listProjects`, `listRuns`, `checkRunStatus`, `createClaudeTask`

Rules: only calls known scripts, validates project IDs against `[a-zA-Z0-9_-]+`, passes arguments as separate array elements (not shell-interpolated), never executes arbitrary user-provided shell.
