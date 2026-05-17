# Plan Artifact Format

This document is the authoritative specification for all Plan artifacts in CreatorMesh.

A **Plan** is the bridge between a vetted idea and N dispatchable coding tasks. It is produced by the CreatorMesh Planner role, reviewed by a human, and consumed by `dispatch_plan.sh`.

---

## Storage model

Plans use a three-layer storage model:

| Layer | Location | Purpose |
|-------|----------|---------|
| **Git artifact** (source of truth) | `docs/plans/<idea-id>/` in the `creator-mesh` repo | Diffable, reviewable, revertible, migratable |
| **GitHub tracker issue** (status board) | In the primary managed-project repo | Human-visible checklist; status board for the plan lifecycle |
| **Runtime index** (cache) | `~/creator-mesh-runtime/plans/index.jsonl` | Local fast lookup; NOT source of truth — reconcile from Git if inconsistent |

The Git artifact is authoritative. The runtime index is derived from it and must never be the only record.

---

## Idea ID convention

Format: `YYYY-MM-DD-<kebab-case-slug>`

Examples:
- `2026-05-18-idea-ranking`
- `2026-05-18-user-auth-flow`
- `2026-06-01-export-to-csv`

The slug must be unique across all plans. `create_plan_task.sh` validates this before dispatch.

---

## Git artifact: `docs/plans/<idea-id>/`

Three files per plan, all created in a single PR by the Planner (Claude Code acting as `agentRole: "planner"`).

### `plan.md`

Human-readable plan. Required structure:

```markdown
# Plan: <Idea Title>

## Idea brief
<Verbatim brief, or a clear 3–5 sentence summary.>

## Goal
<What success looks like — concrete and verifiable. One paragraph.>

## Non-goals
- <Out of scope item>
- ...

## Decomposition rationale
<Why these N tasks, in this order. Note dependencies.>

## Tasks
1. T01 — <Title> — <One-line summary>
2. T02 — <Title> — <One-line summary>
...

## Tracker issue
<GitHub URL of the tracker issue>

## Plan artifact
docs/plans/<idea-id>/
```

### `tasks.jsonl`

One JSON object per line. Each line is a `WorkflowInput` for a child dispatch (see Phase 0 alignment below).

**Schema per line:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | yes | Unique within this plan. Convention: `T01`, `T02`, … |
| `project_id` | string | yes | Target managed project, e.g. `idea-factory` |
| `title` | string | yes | GitHub issue title. Under 72 chars. Action-verb start. |
| `body` | string | yes | Full task body following the Coding-task standard form |
| `depends_on` | string[] | yes | List of `task_id` values this task depends on. Empty array if none. |

**Example line:**

```json
{"task_id":"T01","project_id":"idea-factory","title":"Add rank field to Idea model","body":"Objective: Add a rank field (integer 1–5) to the Idea model.\n\nBackground: The Idea type is defined in src/models/idea.ts. There is currently no ranking concept.\n\nScope:\n- Add `rank: number` field to the Idea interface in src/models/idea.ts\n- Update seed data in src/data/ideas.ts so each sample idea has a rank value between 1 and 5\n\nNon-goals:\n- No UI changes\n- No API changes (that is T02)\n- No migration scripts\n\nAcceptance criteria:\n- Idea interface has `rank: number`\n- All seed ideas have a rank value\n- TypeScript compiles without errors\n\nValidation commands:\nnpm run build\nnpm test\n\nPR requirements:\nKeep the change small and focused. Do not merge automatically. Create a pull request for human review.","depends_on":[]}
```

### `decision-log.md`

Append-only log of decisions, pivots, and scope changes. Updated by:
- The Planner when creating the initial plan
- The operator when dispatching (if scope changed)
- The operator when a child PR merges with unexpected changes
- The operator when a task is added, removed, or re-scoped

**Format:**

```markdown
# Decision Log — <idea-id>

## YYYY-MM-DD — <Decision title>

**Decision:** <What was decided.>

**Alternatives considered:**
<Alternatives and why they were rejected.>

**Rationale:**
<Why this decision.>
```

---

## GitHub tracker issue

Opened by **`dispatch_plan.sh`** in the **primary managed-project repo**, as its first action before dispatching any child tasks. This is the first point at which the target project is touched — intentionally after the human has reviewed and merged the plan PR.

The Planner does **not** create this issue. Keeping tracker issue creation in `dispatch_plan.sh` preserves the human-review gate: if the plan is rejected, the target project is never touched.

**Required structure:**

```markdown
# CreatorMesh Plan Tracker — <Idea Title>

**Idea ID:** <idea-id>
**Plan artifact:** <URL to docs/plans/<idea-id>/ in creator-mesh repo>
**Primary project:** <project_id>
**Status:** planning | plan_ready | dispatching | dispatched | completed

## Tasks
- [ ] T01 — <title> (issue #N when dispatched)
- [ ] T02 — <title>
...

## Notes
Each task is dispatched as a separate GitHub issue.
Child task issues link back to this tracker and to the plan artifact.
```

**Status lifecycle:**

| Status | Meaning | Who sets it |
|--------|---------|-------------|
| `planning` | Plan task dispatched; Planner has not yet created the PR | `create_plan_task.sh` |
| `plan_ready` | Plan PR merged; ready to dispatch child tasks — no target project issue exists yet | Human (after merging plan PR) |
| `dispatching` | Some child tasks dispatched, not all | `dispatch_plan.sh` |
| `dispatched` | All child tasks dispatched | `dispatch_plan.sh` |
| `completed` | All child PRs merged | Human (manual update for now) |

---

## Runtime index: `~/creator-mesh-runtime/plans/index.jsonl`

One JSON object per line. Append-only (except status updates by `dispatch_plan.sh`).

**Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `created_at` | ISO8601 string | When `create_plan_task.sh` was run |
| `updated_at` | ISO8601 string | Last status update (if any) |
| `idea_id` | string | The plan's idea-id slug |
| `primary_project_id` | string | Primary managed project |
| `plan_artifact_path` | string | Relative path in creator-mesh repo, e.g. `docs/plans/2026-05-18-idea-ranking/` |
| `planning_issue_url` | string | URL of the planning task issue in the creator-mesh repo |
| `tracker_issue_url` | string | URL of the tracker issue in the primary managed-project repo (filled after Planner runs) |
| `status` | string | See status lifecycle above |

**This is a cache.** If it drifts from Git truth, `list_plans.sh` will show stale data. Reconcile by comparing `docs/plans/*/` with the index.

---

## Coding-task standard form

Every `body` field in `tasks.jsonl` must follow this structure:

```
Objective: <One sentence.>

Background: <Context. Name specific files, types, endpoints.>

Scope:
- <Specific thing to implement>
- ...

Non-goals:
- <What NOT to do>

Acceptance criteria:
- <Verifiable condition>
- ...

Validation commands:
<Shell commands to verify. If unknown: "Run existing test suite.">

PR requirements:
Keep the change small and focused. Do not merge automatically. Create a pull request for human review.
```

---

## Phase 0 alignment

| Plan concept | Phase 0 concept | Source |
|-------------|----------------|--------|
| `Planner` agent role | `AgentStep { agentRole: "planner" }` | `src/workflows/types.ts` |
| `plan.md` + `tasks.jsonl` + `decision-log.md` | `WorkflowOutput` of the planning `AgentStep` | `src/workflows/types.ts` |
| `tasks.jsonl` entry | `WorkflowInput` for a child `WorkflowDefinition` | `src/workflows/types.ts` |
| Tracker issue | `GovernanceCheckpoint` / `HumanReviewStep` | `src/workflows/types.ts` |
| Runtime index entry | `WorkflowRun` (planning run) storage record | `src/storage/` (Phase 2 target) |

In Phase 2, `create_plan_task.sh` becomes a TypeScript module invoking `AgentStep` with `agentRole: "planner"`, and the runtime index becomes a proper `WorkflowRun` storage query. The naming is already aligned.
