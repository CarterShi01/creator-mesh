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

The full Phase 1 dispatch loop is operational end-to-end.

Verified capabilities:

- GitHub issue comments can trigger Claude Code.
- Claude Code can access the repository through GitHub Actions.
- Claude Code can modify files and push a `claude/...` branch.
- The workflow can create a pull request from the Claude branch.
- Human review remains required before merge.
- `scripts/dispatch/create_claude_task.sh` dispatches a task to any managed project via project registry lookup → GitHub issue → `@claude` comment → run record.
- `scripts/dispatch/list_runs.sh` lists all `WorkflowRun` records from `runs.jsonl`.
- `scripts/dispatch/check_run_status.sh` queries live GitHub state (issue, workflow run, PR) for a given run.
- Dispatch has been validated against `idea-factory` (external managed project).

## What This Proves

CreatorMesh does not need to build its own coding executor in Phase 1.

CreatorMesh acts as the dispatch and control layer: it creates GitHub issues, triggers Claude Code, and tracks outcomes through pull requests. The executor path is GitHub + Claude Code.

## Natural-Language Entry Point

The next step — introducing a natural-language entry point — is underway via:

`skills/creatormesh-dispatch/SKILL.md`

This skill wraps the existing dispatch scripts into a structured, copy-paste-friendly interface. It guides the operator through:

1. Identifying the target `project_id`
2. Crafting a scoped issue title and task body from a plain-language request
3. Calling `create_claude_task.sh`
4. Tracking the resulting run with `list_runs.sh` / `check_run_status.sh`

The skill does not introduce a new runtime, database, or external service. It is a documentation layer over the existing Phase 1 shell workflow.

## Next Steps

- Validate the `creatormesh-dispatch` skill in a live dispatch session.
- Add more managed projects to `projects.yaml` as they are onboarded.
- Phase 2: replace shell scripts with TypeScript modules implementing Phase 0 ports (`RunnerPort`, `ConnectorPort`, `WorkflowRun` storage).
