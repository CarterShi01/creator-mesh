# CreatorMesh Progress Skill

Trigger: "creatormesh-progress" (or: "show plan status", "how is plan X going", "refresh tracker for X")

---

## Purpose

Check the live status of every task in a dispatched CreatorMesh plan and
optionally sync the GitHub tracker issue checklist.

This is the plan-level view — it answers questions like:
- Which tasks have been merged?
- Which PRs are waiting for review?
- Which tasks failed or haven't been dispatched yet?
- How complete is the overall plan?

---

## When to invoke

Use this skill when the user:
- Asks about the progress of a plan or idea
- Wants to know which PRs need review
- Asks to "sync" or "refresh" the tracker issue
- Wants a completion percentage for a plan

---

## Input

The user must provide (or you must infer) the `idea_id` slug, e.g.
`2026-05-18-idea-ranking`.

Flags:
- `--write-back` — persist observed statuses to `runs.jsonl` and `plans/index.jsonl`
- `--refresh-tracker` — rewrite the GitHub tracker issue checklist with live status

Default invocation (read-only, no side effects):
```
scripts/dispatch/plan_progress.sh --idea-id <slug>
```

Full invocation (write back + refresh tracker):
```
scripts/dispatch/plan_progress.sh --idea-id <slug> --write-back --refresh-tracker
```

---

## Preconditions

- `docs/plans/<idea-id>/tasks.jsonl` must exist locally (run `git pull` if missing)
- `~/creator-mesh-runtime/runs/runs.jsonl` must exist (tasks must have been dispatched)
- `gh` CLI must be authenticated

---

## Expected output

```
Plan: 2026-05-18-idea-ranking
Primary project: idea-factory
Plan artifact:   docs/plans/2026-05-18-idea-ranking/
Tracker:         https://github.com/CarterShi01/idea-factory/issues/7
Status:          dispatched

Task    Title                                           Issue    PR      Status
──────  ──────────────────────────────────────────────  ───────  ──────  ──────────────────────────
T01     Add stable 8-char id field to generated ideas   #8       #12     merged
T02     Persist rank overrides in data/ranks.json        #9       #13     merged
T03     Add PATCH /ideas/<id>/rank endpoint              #10      #16     merged
T04     Add `python -m idea_factory rank` CLI            #11      #17     merged

Summary
  Total:            4
  Merged:           4 (100%)
  Needs review:     0
  Failed/blocked:   0
  Running/waiting:  0
  Not dispatched:   0

Next action:
  All tasks merged. Plan is complete.
```

---

## Status values

| Status | Meaning |
|--------|---------|
| `merged` | PR has been merged; task complete |
| `needs_human_review` | PR is open and waiting for review |
| `workflow_running` | Claude Code Action is still running |
| `waiting_for_pr` | Workflow succeeded but no PR yet |
| `waiting_for_workflow` | Issue exists but no workflow run yet |
| `workflow_failed` | Workflow run failed; needs operator attention |
| `pr_closed_without_merge` | PR was closed without merging |
| `not_dispatched` | Task exists in tasks.jsonl but no issue created yet |

---

## Phase 0 alignment

| Concept | Phase 0 mapping |
|---------|----------------|
| This skill | `WorkflowRunnerPort.status(planRunId)` (Phase 2) |
| `--refresh-tracker` | `ConnectorStep` against GitHub connector (Phase 2) |
| Status enum | `WorkflowStepStatus` + Phase 1-specific values |

---

## Related commands

```bash
# List all dispatched run records (with plan/task columns)
scripts/dispatch/list_runs.sh --idea-id <slug>

# List all plans
scripts/dispatch/list_plans.sh

# Check a single issue's status
scripts/dispatch/check_run_status.sh --repo <repo> --issue <n>
```
