# Phase 1→2 ↔ Phase 0 Convergence Map

When building or naming any Phase 1 or Phase 2 construct, consult this table first. The right column is the authoritative name — use it even when the current implementation is a shell script or TypeScript adapter. This makes Phase 3 slot-in possible without renaming.

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
| `GitHubDispatchService` (TS) | `ConnectorPort.execute` via GitHub connector | `src/capabilities/connectors/github/` |
| `FilesystemConnectorAdapter` | `ConnectorPort` implementation | `src/capabilities/connectors/filesystem/` |
| `PMAgent { agentRole: "pm" }` | `AgentStep { agentRole: "pm" }` | `src/agents/pm-agent.ts` |
| `ArchitectAgent { agentRole: "architect" }` | `AgentStep { agentRole: "architect" }` | `src/agents/architect-agent.ts` |
| `PlannerAgent { agentRole: "planner" }` | `AgentStep { agentRole: "planner" }` | `src/agents/planner-agent.ts` |
| `OPAgent { agentRole: "op" }` | `AgentStep { agentRole: "op" }` | `src/agents/op-agent.ts` |
| `FanoutStep` | `WorkflowStep { type: "fanout" }` | `src/workflows/types.ts` |
| `TreeWorkflowRunner` | `WorkflowRunnerPort` implementation | `src/workflows/tree-runner.ts` |
| `idea-decompose.ts` workflow | `WorkflowDefinition` (multi-role pipeline) | `src/workflows/definitions/idea-decompose.ts` |
| `runtime-cli.ts` / `decompose-cli.ts` | CLI surface over LangGraph LLM Loop / multi-role pipeline | `src/runtime-cli.ts`, `src/decompose-cli.ts` |
| `src/server/app.ts` (Hono + SSE) | HTTP surface over `WorkflowRunnerPort` + LLM Loop | `src/server/` |

---

## Phase evolution path

```
Phase 1 (completed — Borrow)
  create_claude_task.sh   →  framed a WorkflowDefinition, created a GitHub issue
  projects.yaml           →  flat ManagedProject registry
  runs.jsonl              →  append-only WorkflowRun log

Phase 2 (NOW — Wrap)
  shell scripts           →  TypeScript modules implementing Phase 0 ports
  runs.jsonl              →  WorkflowRun SQLite adapter (src/storage)
  projects.yaml           →  ManagedProject persistence query (src/storage)
  dispatcher              →  WorkflowDefinition + LocalWorkflowRunner + TreeWorkflowRunner
  executor registry       →  RunnerRegistry (src/capabilities/runners)
  connectors              →  ConnectorPort.execute (GitHub, Filesystem)
  multi-role agents       →  AgentStep { agentRole: pm | architect | planner | op }
  multi-role pipeline     →  idea-decompose.ts WorkflowDefinition
  LLM runtime             →  LangGraph StateGraph in src/runtime/
  HTTP / streaming surface →  Hono + SSE in src/server/
  web client              →  Next.js + Tailwind in clients/creator-app/

Phase 3 (future — Own)
  More RunnerType values  →  research / design / review / growth / content agents
  Richer WorkflowDefinitions → multi-step, multi-role dispatch
  GovernanceEvaluator     →  full implementation in src/governance/
```

---

## Checklist for new Phase 1 constructs

Before adding a new field, file, or concept to the Phase 1 or Phase 2 control plane:

- [ ] Checked this table for an existing Phase 0 name?
- [ ] Using the Phase 0-aligned name (even if the value is just a string today)?
- [ ] If creating a new module: noted the future migration path in a comment or `DESIGN.md`?
- [ ] Not inventing a third name that belongs to neither Phase 0 nor this table?

---

## What this map does NOT cover

- Internal naming inside `src/` modules — those already use Phase 0 names.
- Test file naming — follow the existing `*.smoke.test.ts` pattern.
- GitHub workflow YAML keys — those are GitHub-native, not CreatorMesh constructs.
