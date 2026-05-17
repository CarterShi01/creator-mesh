---
name: creatormesh-dispatch
description: Dispatch a natural-language task to a managed CreatorMesh project. Converts a plain-language request into a GitHub issue + @claude trigger via the existing Phase 1 dispatch script. Use this skill instead of calling create_claude_task.sh by hand.
---

# CreatorMesh Dispatch

Use this skill to turn a natural-language task description into a dispatched CreatorMesh run.

This skill wraps the existing Phase 1 dispatch workflow — no new runtime, no database, no external services. It is a stable human-machine collaboration interface over the shell scripts that already exist.

```
Natural language request
  ↓
Identify project_id + craft title + craft body
  ↓
scripts/dispatch/create_claude_task.sh
  ↓
GitHub issue → @claude comment → Claude Code → branch → PR
  ↓
scripts/dispatch/check_run_status.sh
```

---

## Prerequisites

Before dispatching, confirm:

- `~/creator-mesh-runtime/config/projects.yaml` exists and lists the target project
- `gh` CLI is authenticated (`gh auth status`)
- The target repo has the Claude Code GitHub Action configured

Check available projects:

```bash
cat ~/creator-mesh-runtime/config/projects.yaml
```

---

## Step 1 — Identify the target project

Determine `project_id` from the projects registry.

Current managed projects:

| project_id | Repo |
|-----------|------|
| `idea-factory` | `CarterShi01/idea-factory` |

If the request does not name a project, ask which one it targets.

---

## Step 2 — Craft a concise issue title

Rules:

- Under 72 characters
- Starts with a verb: `Add`, `Fix`, `Implement`, `Refactor`, `Update`
- Describes the outcome, not the approach
- Scope-limited: prefer `Add mock idea ranking` over `Improve the whole idea system`

---

## Step 3 — Write a focused task body

Rules:

- Lead with what to do, not why
- Name the file, function, or component to touch if known
- One coherent change per dispatch — keep scope small
- The execution policy footer (human review, no auto-merge) is added automatically by the script

Good body example:

```
Please implement a small and focused mock idea ranking feature.

- Add a rank field (integer, 1–5) to the Idea type.
- Seed three example ideas with different rank values.
- Expose a GET /ideas?sort=rank endpoint that returns ideas sorted by rank descending.
- Keep the change focused to the data model and API layer only. No UI changes.
```

---

## Step 4 — Call the dispatch script

```bash
scripts/dispatch/create_claude_task.sh \
  --project <project_id> \
  --title "<Issue title>" \
  --body "<Task body>"
```

The script will:

1. Look up the repo for `<project_id>` in `projects.yaml`
2. Create a GitHub issue with the formatted task body
3. Post a `@claude` comment to trigger Claude Code
4. Append a `WorkflowRun` record to `~/creator-mesh-runtime/runs/runs.jsonl`

---

## Step 5 — Track the run

List all runs:

```bash
scripts/dispatch/list_runs.sh
```

Check status of the most recent run:

```bash
scripts/dispatch/check_run_status.sh --latest
```

Check status of a specific run:

```bash
scripts/dispatch/check_run_status.sh --project <project_id> --issue <issue_number>
```

### Status reference

| Status | Meaning | Next action |
|--------|---------|-------------|
| `waiting_for_workflow` | Claude Code hasn't triggered yet | Confirm the repo has the Action and `issue_comment` trigger |
| `workflow_running` | Claude Code is working | Wait, then check again |
| `waiting_for_pr` | Workflow succeeded, PR not visible yet | Check whether the Claude branch was pushed |
| `needs_human_review` | PR is open | **Review and merge the PR** |
| `merged` | Closed | No action needed |
| `workflow_failed` | Workflow errored | Run `gh run view <run-id> --log-failed` |

---

## Constraints

- **No auto-merge.** Human review is always required before merge.
- **One issue = one WorkflowRun.** Do not dispatch multiple tasks to the same issue.
- **Keep scope small.** Large tasks produce large PRs that are hard to review.
- **Always use the script.** Direct `gh issue create` calls skip the run record and break `check_run_status.sh`.

---

## End-to-end example

User says: "给 idea-factory 加一个 mock idea ranking 功能"

**1. project_id:** `idea-factory`

**2. Title:** `Add mock idea ranking`

**3. Body:**
```
Please implement a small and focused mock idea ranking feature.

- Add a rank field (integer, 1–5) to the Idea type.
- Seed three example ideas with different rank values.
- Expose a GET /ideas?sort=rank endpoint that returns ideas sorted by rank descending.
- Keep this focused to the data model and API layer only. No UI changes.
```

**4. Dispatch:**
```bash
scripts/dispatch/create_claude_task.sh \
  --project idea-factory \
  --title "Add mock idea ranking" \
  --body "Please implement a small and focused mock idea ranking feature.

- Add a rank field (integer, 1–5) to the Idea type.
- Seed three example ideas with different rank values.
- Expose a GET /ideas?sort=rank endpoint that returns ideas sorted by rank descending.
- Keep this focused to the data model and API layer only. No UI changes."
```

**5. Track:**
```bash
scripts/dispatch/check_run_status.sh --latest
```

---

## Phase 0 alignment

| Skill step | Phase 0 concept |
|-----------|----------------|
| Natural language → title + body | `WorkflowInput` (fields of `WorkflowDefinition`) |
| `create_claude_task.sh` call | `WorkflowDefinition` dispatch via `RunnerPort.invoke` |
| Run record append | `WorkflowRun` storage write |
| `check_run_status.sh` lookup | `WorkflowRun` status query |

In Phase 2, this skill will guide users through a typed `WorkflowInput` form backed by a TypeScript module instead of a shell script. The step names and field names remain the same.

See `docs/control-plane/convergence.md` for the full naming map.
