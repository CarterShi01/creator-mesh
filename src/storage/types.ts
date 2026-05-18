import type { WorkflowRunStatus, RunnerType } from "../workflows/types.js";

// Phase 1 storage type for a plan or task definition.
// Converges toward WorkflowDefinition (src/workflows/port.ts) in Phase 2 when
// dispatch definitions gain explicit steps[].
export interface WorkflowDefinitionRecord {
  id: string; // "plan:<ideaId>" or "task:<ideaId>:<taskId>"
  kind: "plan" | "task";
  ideaId: string;
  taskId?: string;
  name: string;
  description: string;
  version: string;
  projectId?: string;
  body: string; // raw task body text (for kind="task"); empty for plans
  artifactPath?: string; // docs/plans/<ideaId>/ for kind="plan"
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Phase 1 storage type for a dispatched run record.
// Converges toward WorkflowRun (src/workflows/port.ts) in Phase 2 when runs gain
// stepHistory and WorkflowContext.
export interface WorkflowRunRecord {
  id: string; // deterministic hash; unique per GitHub issue dispatch
  kind: "plan" | "task";
  ideaId?: string; // undefined for ad-hoc dispatches without a plan
  taskId?: string;
  projectId?: string;
  repo?: string;
  executor?: RunnerType;
  issueNumber?: string;
  issueUrl?: string;
  prNumber?: string;
  prUrl?: string;
  planningIssueUrl?: string; // kind="plan" only
  trackerIssueUrl?: string; // kind="plan" only
  title?: string;
  status: WorkflowRunStatus;
  createdAt: string; // ISO 8601
  statusUpdatedAt?: string;
  completedAt?: string;
}

export type RelationType =
  | "task_depends_on"
  | "plan_contains_task"
  | "plan_tracked_by_issue"
  | "plan_planned_by_issue";

export interface RelationRow {
  fromId: string;
  toId: string;
  relationType: RelationType;
  createdAt: string; // ISO 8601
}

export interface PlanProgressRollup {
  ideaId: string;
  total: number;
  merged: number;
  needsReview: number;
  failed: number;
}
