import type { WorkflowRunRecord, PlanProgressRollup } from "../types.js";

export interface WorkflowRunStore {
  create(record: WorkflowRunRecord): void;
  get(id: string): WorkflowRunRecord | null;
  updateStatus(id: string, status: WorkflowRunRecord["status"], statusUpdatedAt?: string): void;
  updateIssue(id: string, issueNumber: string, issueUrl: string): void;
  updatePr(id: string, prNumber: string, prUrl: string): void;
  list(filter?: { kind?: "plan" | "task"; ideaId?: string; status?: string }): WorkflowRunRecord[];
  findByIssue(repo: string, issueNumber: string): WorkflowRunRecord | null;
  /** Aggregates merged/failed/needsReview counts for all task runs under this idea. */
  planProgress(ideaId: string): PlanProgressRollup;
}
