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

The full Phase 1 dispatch loop is operational end-to-end, and the first multi-role addition (Planner) is in place.

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
- `scripts/dispatch/dispatch_plan.sh` creates the tracker issue in the target project (first target-project touch, after human plan approval), then iterates `tasks.jsonl` and dispatches each as a child `WorkflowRun`. Supports `--yes` for non-interactive dispatch.
- `scripts/dispatch/list_plans.sh` lists all plan records from the runtime plans index.
- Plan storage follows the three-layer model: Git artifact (source of truth) + tracker issue (status board) + runtime index (cache).
- Natural-language entry via `skills/creatormesh-plan/SKILL.md`.
- Plan format fully specified in `docs/control-plane/plan-artifact-format.md`.
- All new constructs named in Phase 0 alignment — see `docs/control-plane/convergence.md`.
- First real plan validated: `2026-05-18-idea-ranking` — 4 child tasks dispatched to `idea-factory` (issues #8–#11).

**GitHub Action (`.github/workflows/claude.yml`):**
- `Write`, `Edit`, `Bash(mkdir *)`, `Bash(gh issue create *)`, `Bash(gh pr create *)`, `Bash(gh api *)` added to `allowedTools`.
- `--max-turns` raised from 30 to 60. Required for the Planner role to complete without hitting permission denials or turn limits.

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

## Known Gaps

- `plans/index.jsonl` `tracker_issue_url` field is empty for the first plan run (dispatched before the design fix moved tracker issue creation to `dispatch_plan.sh`). Future runs will populate it correctly.
- No `kind: "plan" | "task"` field in `runs.jsonl` — all records appear as tasks; plans are only distinguishable by title prefix `[Plan]`.
- Tracker issue checklist is not auto-updated as child PRs merge — manual update required.

## Next Steps

- Add `kind: "plan" | "task"` field to `runs.jsonl` entries (back-compat with default `"task"`).
- Build a helper to auto-update the tracker issue checklist as child PRs merge.
- Monitor idea-factory child PRs (#8–#11) through to merge; close tracker issue when all merged.
- Phase 2: replace shell scripts with TypeScript modules implementing Phase 0 ports (`RunnerPort`, `ConnectorPort`, `WorkflowRun` storage adapter).
