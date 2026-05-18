# CreatorMesh Control Plane Progress

## Phase 1: Borrow

CreatorMesh Phase 1 focuses on borrowing existing tools before building a full internal agent runtime.

The current execution path is:

1. A GitHub issue is created in the target repository.
2. A comment mentioning `@claude` triggers the Claude Code GitHub Action.
3. Claude Code reads the issue, modifies the repository, and pushes changes to a `claude/...` branch.
4. The workflow creates a pull request from the Claude branch.
5. A human reviews and merges the pull request.

## Current Status

The full Phase 1 dispatch loop is operational end-to-end. Task-level control and plan-level control are both in place and validated against a real plan (`2026-05-18-idea-ranking`).

### Verified capabilities

**Single-task dispatch (operational):**
- GitHub issue comments can trigger Claude Code.
- Claude Code can access the repository through GitHub Actions.
- Claude Code can modify files and push a `claude/...` branch.
- The workflow can create a pull request from the Claude branch.
- Human review remains required before merge.
- `scripts/dispatch/create_claude_task.sh` dispatches a task to any managed project via project registry lookup → GitHub issue → `@claude` comment → run record.
- `scripts/dispatch/list_runs.sh` lists all `WorkflowRun` records from `runs.jsonl`.
- `scripts/dispatch/check_run_status.sh` queries live GitHub state (issue, workflow run, PR) for a given run.
- Dispatch validated against `idea-factory` (external managed project) end-to-end.
- Natural-language entry via `skills/creatormesh-dispatch/SKILL.md`.

**Planner role (validated end-to-end 2026-05-18):**
- `scripts/dispatch/create_plan_task.sh` dispatches a planning task into the `creator-mesh` repo itself using a planner prompt template.
- `scripts/dispatch/templates/planner-prompt.md` instructs Claude Code to produce `plan.md`, `tasks.jsonl`, and `decision-log.md` only — no external repo writes.
- `scripts/dispatch/dispatch_plan.sh` creates the tracker issue in the target project (first target-project touch, after human plan approval), validates topological order of `tasks.jsonl`, then iterates tasks sequentially (waits for each PR to merge before dispatching the next). Supports `--yes` for non-interactive dispatch and `--no-wait` for dry runs.
- After each dispatch, `dispatch_plan.sh` back-writes `issue_number`/`issue_url` into `tasks.jsonl` so the Git artifact records what was dispatched.
- `scripts/dispatch/list_plans.sh` lists all plan records from the runtime plans index.
- Plan storage follows the three-layer model: Git artifact (source of truth) + tracker issue (status board) + runtime index (cache).
- Natural-language entry via `skills/creatormesh-plan/SKILL.md`.
- Plan format fully specified in `docs/control-plane/plan-artifact-format.md`.
- All new constructs named in Phase 0 alignment — see `docs/control-plane/convergence.md`.
- First real plan validated: `2026-05-18-idea-ranking` — 4 child tasks dispatched to `idea-factory` (issues #8–#11).

**Plan-level progress tracking (validated 2026-05-18):**
- `scripts/dispatch/plan_progress.sh` aggregates per-task GitHub status into a plan-level view: per-task table, completion percentage, and next-action hints.
- `--write-back` refreshes `runs.jsonl` status fields from live GitHub state and advances `plans/index.jsonl` to `completed` when all tasks are merged.
- `--refresh-tracker` rewrites the GitHub tracker issue checklist, marking tasks `[x]` as they merge and appending issue/PR numbers.
- Natural-language entry via `skills/creatormesh-progress/SKILL.md`.
- `runs.jsonl` records now carry `kind` (`plan` | `task`), `plan_id`, and `task_id` fields, enabling plan-scoped queries (`list_runs.sh --idea-id <slug>`).
- Validated against `2026-05-18-idea-ranking`: `runs.jsonl` statuses refreshed, `tracker_issue_url` backfilled, tracker issue #7 checklist updated.

**GitHub Action (`.github/workflows/claude.yml`):**
- `Write`, `Edit`, `Bash(mkdir *)`, `Bash(gh issue create *)`, `Bash(gh pr create *)`, `Bash(gh api *)` added to `allowedTools`.
- `--max-turns` raised from 30 to 60. Required for the Planner role to complete without hitting permission denials or turn limits.

**First real LLM Loop runtime (implemented 2026-05-18, pending PR):**
- `src/runtime/loop/runtime-loop.ts` — `runRuntimeTurn(input)` production entry point; loads `ANTHROPIC_API_KEY` + `CREATORMESH_RUNTIME_MODEL`, delegates to LangGraph graph.
- `src/runtime/graph/create-runtime-graph.ts` — LangGraph `StateGraph` with 4 nodes: `llm_decide_tool → check_permission → execute_tool → respond`. Real LLM-driven, not a keyword router.
- `src/runtime/graph/runtime-state.ts` — `RuntimeStateAnnotation` (`Annotation.Root`) and `RuntimeStatus` type.
- `src/runtime/llm/runtime-llm-client.ts` — `ChatAnthropic` (LangChain `@langchain/anthropic`) with `withStructuredOutput` for structured `RuntimeToolDecision` (intent + toolName + toolArgs + confidence).
- `src/runtime/llm/model-config.ts` — reads env vars; fails fast with clear error if `ANTHROPIC_API_KEY` missing.
- `src/runtime/tools/tool-registry.ts` + `controller-tools.ts` — `RuntimeTool` interface, `RuntimeToolName` union, `getToolRegistry()` with four Phase 1 tools.
- `src/runtime/adapters/shell-controller-adapter.ts` — wraps existing `scripts/dispatch/*.sh` safely via `child_process.execFile`, validates IDs, no user-shell interpolation.
- `src/runtime/policies/permission-policy.ts` — `list_projects` / `list_runs` / `check_run_status` auto-allowed; `create_claude_task` returns `needs_approval` (no silent dispatch).
- `src/runtime/events/runtime-event-writer.ts` — appends JSONL to `~/creator-mesh-runtime/runtime-events/runtime-events.jsonl`.
- `src/runtime/__tests__/runtime-loop.test.ts` — 24 tests covering: permission policy, tool registry, event writer (filesystem), missing API key, `list_runs` flow, `check_run_status` flow, `create_claude_task` approval block, clarification flow.
- New dependencies: `@langchain/langgraph@1.3.0`, `@langchain/anthropic@1.3.29`, `@langchain/core@1.1.46`.
- `.gitignore` fixed: `runtime/` → `/runtime/` so `src/runtime/` subdirectories are no longer git-ignored.
- `docs/architecture.md` updated: LLM Loop items marked as implemented; runtime architecture principles added.
- `docs/context-map.md` updated: `src/runtime` description updated to reflect LLM Loop.
- Full test suite: 251 tests passing (up from 242).

## What This Proves

CreatorMesh does not need to build its own coding executor in Phase 1.

CreatorMesh acts as the dispatch and control layer: it decomposes ideas into tasks, creates GitHub issues, triggers Claude Code, and tracks outcomes through pull requests. The executor path is GitHub + Claude Code.

## Storage Model

| Asset | Location | Purpose |
|-------|----------|---------|
| Task run records | `~/creator-mesh-runtime/runs/runs.jsonl` | `WorkflowRun` log (one per dispatched task) |
| Plan index | `~/creator-mesh-runtime/plans/index.jsonl` | Runtime cache of plan metadata |
| Plan artifacts | `docs/plans/<idea-id>/` in `creator-mesh` repo | Git-backed source of truth for plans |
| Project registry | `~/creator-mesh-runtime/config/projects.yaml` | `ManagedProject` entries |
| Runtime events | `~/creator-mesh-runtime/runtime-events/runtime-events.jsonl` | LLM Loop event log |

## Known Gaps

- `check_run_status.sh` branch-matching only covers `claude/issue-N-*` branches. Tasks whose final PR used a custom branch (e.g., a rebase/fix branch) will show `pr_closed_without_merge` even if the work was merged — T04 (`idea-factory#11`, PR #15 closed, actual work in PR #17 `rebase/t04-cli`) demonstrates this. `plan_progress.sh` inherits this limitation.
- `dispatch_plan.sh` does not automatically commit the back-written `tasks.jsonl` (`issue_number`/`issue_url` fields) — the operator must `git add docs/plans/<idea-id>/tasks.jsonl && git commit` after dispatch.
- Tracker issue checklist refresh requires explicit `--refresh-tracker` flag — not automatic on merge.
- No `WorkflowRunnerPort` TypeScript implementation yet (Phase 2 target).
- LLM Loop: `create_claude_task` returns `needs_approval` but does not yet prompt for interactive confirmation — the operator must re-invoke with explicit intent after seeing the approval message.
- LLM Loop: no CLI or trigger surface yet — `runRuntimeTurn` is callable from code/tests only.

## Next Steps

- Add a minimal CLI entry point (e.g., `tsx src/cli.ts "show recent runs"`) to exercise `runRuntimeTurn` end-to-end from the terminal.
- Add interactive `create_claude_task` approval flow (prompt user to confirm before dispatching).
- Widen `check_run_status.sh` PR search to cover non-`claude/` branches (e.g., search by issue-closing keyword `closes #N` via `gh pr list --search`).
- Add `git commit` reminder or automation after `dispatch_plan.sh` back-writes `tasks.jsonl`.
- Phase 2: replace shell scripts with TypeScript modules implementing Phase 0 ports (`RunnerPort`, `ConnectorPort`, `WorkflowRun` storage adapter).
