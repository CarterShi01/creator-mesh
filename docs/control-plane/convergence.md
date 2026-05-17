# Phase 1 ↔ Phase 0 Convergence Map

When building or naming any Phase 1 construct, consult this table first. The right column is the authoritative name — use it even when the current implementation is a shell script or YAML field. This makes Phase 2 slot-in possible without renaming.

See `docs/blueprint.md` for the strategic rationale behind this rule.

---

## Terminology mapping

| Phase 1 current implementation | Phase 0 aligned name | Phase 0 source |
|-------------------------------|----------------------|----------------|
| dispatch task (shell invocation) | `WorkflowDefinition` | `src/workflows/` |
| `projects.yaml` entry | `ManagedProject` config entry | `src/capabilities/runners/` (Phase 2 target) |
| `runs.jsonl` record | `WorkflowRun` | `src/workflows/` |
| `executor` field value (e.g. `"claude-code"`) | `RunnerType` | `src/capabilities/runners/` |
| GitHub issue creation step | `ConnectorStep` (GitHub connector) | `src/capabilities/connectors/` |
| `@claude` comment that triggers Claude Code | `RunnerPort.invoke` | `src/capabilities/runners/claude-code/` |
| PR human review gate | `HumanReviewStep` + `GovernanceCheckpoint` | `src/workflows/`, `src/governance/` |
| run status string (`"dispatched"`, `"running"`, etc.) | `WorkflowRunStatus` enum | `src/workflows/` |
| GitHub issue URL in a run record | `WorkflowRun` output field | `src/workflows/` |
| task `title` and `body` | `WorkflowDefinition.name` + `WorkflowInput` fields | `src/workflows/` |
| project registry lookup | `ManagedProject` storage query | `src/storage/` (Phase 2 target) |
| run tracking append | `WorkflowRun` storage write | `src/storage/` (Phase 2 target) |
| **Planner role** (`create_plan_task.sh` dispatch into creator-mesh) | `AgentStep { agentRole: "planner" }` | `src/workflows/types.ts` |
| `docs/plans/<idea-id>/plan.md` + `tasks.jsonl` + `decision-log.md` | `WorkflowOutput` of the planning `AgentStep` | `src/workflows/types.ts` |
| `tasks.jsonl` entry (one child task spec) | `WorkflowInput` for a child `WorkflowDefinition` | `src/workflows/types.ts` |
| Tracker issue (in primary managed-project repo) | `GovernanceCheckpoint` | `src/workflows/`, `src/governance/` |
| `~/creator-mesh-runtime/plans/index.jsonl` | `WorkflowRun` storage cache (planning runs) | `src/storage/` (Phase 2 target) |
| Idea ID slug (`YYYY-MM-DD-<slug>`) | `WorkflowDefinition` identifier prefix | `src/workflows/` |

---

## Phase evolution path

```
Phase 1 (NOW — Borrow)
  create_claude_task.sh   →  frames a WorkflowDefinition, creates a GitHub issue
  projects.yaml           →  flat ManagedProject registry
  runs.jsonl              →  append-only WorkflowRun log

Phase 1.5 (Wrap begins)
  shell scripts           →  TypeScript modules implementing Phase 0 ports
  runs.jsonl              →  WorkflowRun storage adapter (src/storage)
  projects.yaml           →  ManagedProject persistence query

Phase 2 (Full Wrap)
  dispatcher              →  WorkflowDefinition + LocalWorkflowRunner
  executor registry       →  RunnerRegistry (src/capabilities/runners)
  connectors              →  ConnectorPort.execute via GitHub connector
  governance              →  GovernanceEvaluator on every HumanReviewStep

Phase 1.5 (Planner introduced — NOW)
  create_plan_task.sh     →  AgentStep { agentRole: "planner" } dispatch
  planner-prompt.md       →  WorkflowDefinition for the planning role
  tasks.jsonl entry       →  WorkflowInput for child WorkflowDefinition
  plans/index.jsonl       →  WorkflowRun cache for planning runs
  dispatch_plan.sh        →  iterates WorkflowInput[], calls RunnerPort per task

Phase 2 (Full Wrap)
  dispatcher              →  WorkflowDefinition + LocalWorkflowRunner
  executor registry       →  RunnerRegistry (src/capabilities/runners)
  connectors              →  ConnectorPort.execute via GitHub connector
  governance              →  GovernanceEvaluator on every HumanReviewStep

Phase 3 (Own)
  More RunnerType values   →  research / design / review / growth / content agents
  Richer WorkflowDefinitions → multi-step, multi-role dispatch
  Planner → TypeScript module implementing AgentStep with agentRole: "planner"
```

---

## Checklist for new Phase 1 constructs

Before adding a new field, file, or concept to the Phase 1 control plane:

- [ ] Checked this table for an existing Phase 0 name?
- [ ] Using the Phase 0-aligned name (even if the value is just a string today)?
- [ ] If creating a new module: noted the future migration path in a comment or `DESIGN.md`?
- [ ] Not inventing a third name that belongs to neither Phase 0 nor this table?

---

## What this map does NOT cover

- Internal naming inside `src/` modules — those already use Phase 0 names.
- Test file naming — follow the existing `*.smoke.test.ts` pattern.
- GitHub workflow YAML keys — those are GitHub-native, not CreatorMesh constructs.
