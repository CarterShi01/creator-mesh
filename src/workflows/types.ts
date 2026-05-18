import type { CapabilityType } from "../capabilities/connectors/index.js";
import type { RunnerTaskType } from "../capabilities/runners/index.js";

export type WorkflowStepType =
  | "agent"
  | "connector"
  | "runner"
  | "knowledge"
  | "human-review"
  | "storage";

export type WorkflowRunStatus =
  // Phase 0 lifecycle
  | "created" | "running" | "paused" | "completed" | "failed" | "cancelled"
  // Phase 1 dispatch states
  | "dispatched" | "planning" | "plan_ready" | "dispatching"
  // Phase 1 GitHub-derived states (from check_run_status.sh overall token)
  | "merged" | "needs_human_review" | "pr_closed_without_merge"
  | "waiting_for_workflow" | "workflow_running" | "waiting_for_pr" | "workflow_failed"
  | "not_dispatched" | "unknown";

// Phase 2 target: will align with RunnerPort abstractions.
export type RunnerType = "claude-code" | "human" | "script" | "codex" | "openhands";

// Phase 2 target: will be persisted via src/storage ManagedProjectStore.
export interface ManagedProject {
  id: string;
  repo: string; // "owner/name"
  defaultBranch: string;
  executor: RunnerType;
  allowDirectMerge: boolean;
  allowDeploy: boolean;
}

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type GovernanceApprovalRequirement = "always" | "conditional" | "never";

export type WorkflowResultStatus =
  | "completed"
  | "failed"
  | "paused"
  | "cancelled";

export type WorkflowResumeDecision = "accept" | "reject";

// StepInputMapping: "$input.fieldName" or "$steps.stepId.outputKey"
export type StepInputMapping = Record<string, string>;

export interface WorkflowInputSchema {
  [key: string]: string;
}

export interface WorkflowInput {
  [key: string]: unknown;
}

export interface WorkflowOutput {
  [key: string]: unknown;
}

// ──────────────────────────────────────────────
// Step type interfaces
// ──────────────────────────────────────────────

export interface WorkflowStepBase {
  stepId: string;
  name: string;
  type: WorkflowStepType;
  description: string;
  onSuccess: string | "complete";
  onFailure: string | "fail" | "human-review";
  requiresApproval?: boolean;
}

export interface AgentStep extends WorkflowStepBase {
  type: "agent";
  agentRole: string;
  inputMapping: StepInputMapping;
  outputKey: string;
}

export interface ConnectorStep extends WorkflowStepBase {
  type: "connector";
  connectorId: string;
  capabilityType: CapabilityType;
  resourceType: string;
  inputMapping: StepInputMapping;
  outputKey: string;
}

export interface RunnerStep extends WorkflowStepBase {
  type: "runner";
  runnerId: string;
  taskType: RunnerTaskType;
  inputMapping: StepInputMapping;
  outputKey: string;
}

export interface KnowledgeStep extends WorkflowStepBase {
  type: "knowledge";
  operation: "read" | "write" | "classify" | "link";
  inputMapping: StepInputMapping;
  outputKey: string;
}

export interface HumanReviewStep extends WorkflowStepBase {
  type: "human-review";
  prompt: string;
  acceptLabel: string;
  rejectLabel: string;
  onAccept: string | "complete";
  onReject: string | "fail";
}

export interface StorageStep extends WorkflowStepBase {
  type: "storage";
  operation: "save" | "load";
  storageKey: string;
  inputMapping: StepInputMapping;
  outputKey: string;
}

export type WorkflowStep =
  | AgentStep
  | ConnectorStep
  | RunnerStep
  | KnowledgeStep
  | HumanReviewStep
  | StorageStep;
