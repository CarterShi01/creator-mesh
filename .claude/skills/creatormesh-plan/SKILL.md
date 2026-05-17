---
name: creatormesh-plan
description: Decompose a vetted idea into a structured set of dispatchable coding tasks. Takes an arbitrary idea brief, dispatches a Planner into the creator-mesh repo, and produces a Git-backed Plan artifact (plan.md + tasks.jsonl + decision-log.md) for human review before any code is written.
---

# CreatorMesh Plan

Use this skill to bridge the gap between **a vetted idea** and **N dispatchable coding tasks**.

This skill wraps the Phase 1 Planner workflow:

```
Idea brief (arbitrary text)
  ↓
scripts/dispatch/create_plan_task.sh
  ↓
Claude Code (agentRole: "planner") in creator-mesh repo
  ↓
PR: docs/plans/<idea-id>/plan.md + tasks.jsonl + decision-log.md
  ↓
Human reviews plan PR, merges
  ↓
scripts/dispatch/dispatch_plan.sh   (iterates tasks.jsonl, y/n per task)
  ↓
N child dispatches → existing issue → @claude → PR → human review loop
```

No new runtime. No database. The Plan is Git-backed, diffable, and reviewable.

---

## Prerequisites

- `~/creator-mesh-runtime/config/projects.yaml` exists and includes both `creator-mesh` and the target project
- `gh` CLI is authenticated
- `creator-mesh` repo has the Claude Code GitHub Action configured

---

## Step 1 — Write the idea brief

The brief can be:
- A few sentences ("Add mock idea ranking to idea-factory")
- A structured doc (background, goal, constraints, non-goals)
- Plain conversational text

The Planner accepts any level of detail. More detail → better task decomposition.

Save it to a file or pass inline:

```bash
# As a file
echo "Add an idea ranking system to idea-factory.
- Ideas should have a rank field (integer 1–5).
- The API should support sorting by rank.
- Keep changes to data model and API only; no UI." > /tmp/brief.md

# Or inline (for short briefs)
BRIEF="Add idea ranking to idea-factory. Rank is integer 1–5. API sort support needed."
```

---

## Step 2 — Choose an idea ID

Format: `YYYY-MM-DD-<kebab-case-slug>`

Examples:
- `2026-05-18-idea-ranking`
- `2026-05-18-user-auth`
- `2026-06-01-export-csv`

Must be unique across all plans.

---

## Step 3 — Dispatch the Planner

```bash
# With a brief file
scripts/dispatch/create_plan_task.sh \
  --idea-id 2026-05-18-idea-ranking \
  --project idea-factory \
  --brief-file /tmp/brief.md

# With inline brief
scripts/dispatch/create_plan_task.sh \
  --idea-id 2026-05-18-idea-ranking \
  --project idea-factory \
  --brief "Add idea ranking to idea-factory. Rank is integer 1–5. API sort support needed."
```

The script will:
1. Build the task body from the brief + planner prompt template
2. Dispatch a `[Plan]` task into `creator-mesh` (the control-plane repo)
3. Append a record to `~/creator-mesh-runtime/plans/index.jsonl`

---

## Step 4 — Review the plan PR

Claude Code will:
1. Create `docs/plans/<idea-id>/plan.md`, `tasks.jsonl`, `decision-log.md`
2. Open a tracker issue in the primary managed-project repo
3. Open a PR in `creator-mesh` for your review

**Review checklist:**
- [ ] Tasks are small, atomic, and independently reviewable
- [ ] Each task has a clear Acceptance Criteria
- [ ] `depends_on` is correct (T02 depends on T01 if T02 needs T01's output)
- [ ] No task spans more than one coherent change
- [ ] Tracker issue opened and linked in `plan.md`

Edit the plan files in the PR if needed. Then merge.

---

## Step 5 — Pull the plan locally

```bash
git pull   # get the merged plan artifact
```

---

## Step 6 — Dispatch child tasks

```bash
scripts/dispatch/dispatch_plan.sh \
  --idea-id 2026-05-18-idea-ranking \
  --project idea-factory
```

The script iterates `tasks.jsonl`. For each task it shows you the title, body preview, and asks `[y/N]`. On `y` it calls `create_claude_task.sh` and creates the child issue. Each child issue includes a back-link to the tracker issue and plan artifact.

---

## Step 7 — Track child runs

```bash
# List all runs (includes child tasks)
scripts/dispatch/list_runs.sh

# Check status of the latest child run
scripts/dispatch/check_run_status.sh --latest

# Check a specific child run
scripts/dispatch/check_run_status.sh --project idea-factory --issue <number>

# List all plans
scripts/dispatch/list_plans.sh
```

---

## Status reference

### Plan statuses

| Status | Meaning |
|--------|---------|
| `planning` | Planner dispatched; plan PR not yet merged |
| `plan_ready` | Plan PR merged; ready to dispatch child tasks |
| `dispatching` | Some child tasks dispatched |
| `dispatched` | All child tasks dispatched |
| `completed` | All child PRs merged |

### Child run statuses (from `check_run_status.sh`)

| Status | Next action |
|--------|-------------|
| `workflow_running` | Wait, check again |
| `needs_human_review` | Review and merge the PR |
| `merged` | Done |
| `workflow_failed` | `gh run view <run-id> --log-failed` |

---

## Constraints

- **No auto-merge.** Every child task PR requires human review.
- **One task = one issue = one WorkflowRun.** Do not combine tasks.
- **Always dispatch via the scripts.** Direct `gh issue create` bypasses the run record.
- **Plan is Git-backed.** The runtime index is a cache; the `docs/plans/<idea-id>/` directory is the source of truth.
- **Human gate before dispatch.** Always review the plan PR before running `dispatch_plan.sh`.

---

## End-to-end example

User says: "给 idea-factory 做一个完整的 idea ranking 功能"

**1. Brief file** (`/tmp/brief.md`):
```
Add a complete idea ranking system to idea-factory.

Goals:
- Ideas should have a numeric rank field (integer, 1–5).
- The existing ideas list API should support ?sort=rank.
- A new API endpoint for updating an idea's rank.

Non-goals:
- No UI changes.
- No user authentication.
- No database migrations (use mock data).
```

**2. Idea ID:** `2026-05-18-idea-ranking`

**3. Dispatch Planner:**
```bash
scripts/dispatch/create_plan_task.sh \
  --idea-id 2026-05-18-idea-ranking \
  --project idea-factory \
  --brief-file /tmp/brief.md
```

**4.** Claude Code creates PR with:
- `docs/plans/2026-05-18-idea-ranking/plan.md`
- `docs/plans/2026-05-18-idea-ranking/tasks.jsonl` (3 tasks: T01 model, T02 list sort, T03 update endpoint)
- `docs/plans/2026-05-18-idea-ranking/decision-log.md`
- Tracker issue in `idea-factory`

**5.** Review and merge plan PR.

**6.** `git pull` then `scripts/dispatch/dispatch_plan.sh --idea-id 2026-05-18-idea-ranking --project idea-factory`

**7.** Three child tasks dispatched → three PRs → three human reviews → merged.

---

## Phase 0 alignment

| Skill step | Phase 0 concept |
|-----------|----------------|
| Idea brief | `WorkflowInput` |
| `create_plan_task.sh` | `AgentStep { agentRole: "planner" }` dispatch |
| `tasks.jsonl` entry | `WorkflowInput` for a child `WorkflowDefinition` |
| Tracker issue | `GovernanceCheckpoint` |
| `dispatch_plan.sh` | Iterates `WorkflowInput[]`, invokes `RunnerPort` per task |

See `docs/control-plane/plan-artifact-format.md` for full format spec.
See `docs/control-plane/convergence.md` for the Phase 0 naming map.
