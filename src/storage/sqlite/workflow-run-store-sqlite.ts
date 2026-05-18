import type Database from "better-sqlite3";
import type { WorkflowRunStore } from "../ports/workflow-run-store.js";
import type { WorkflowRunRecord, PlanProgressRollup } from "../types.js";
import type { WorkflowRunStatus } from "../../workflows/types.js";

interface RunRow {
  id: string;
  kind: "plan" | "task";
  idea_id: string | null;
  task_id: string | null;
  project_id: string | null;
  repo: string | null;
  executor: string | null;
  issue_number: string | null;
  issue_url: string | null;
  pr_number: string | null;
  pr_url: string | null;
  planning_issue_url: string | null;
  tracker_issue_url: string | null;
  title: string | null;
  status: string;
  created_at: string;
  status_updated_at: string | null;
  completed_at: string | null;
}

interface ProgressRow {
  idea_id: string;
  total: number;
  merged: number;
  needs_review: number;
  failed: number;
}

function toRecord(row: RunRow): WorkflowRunRecord {
  return {
    id: row.id,
    kind: row.kind,
    ideaId: row.idea_id ?? undefined,
    taskId: row.task_id ?? undefined,
    projectId: row.project_id ?? undefined,
    repo: row.repo ?? undefined,
    executor: row.executor as WorkflowRunRecord["executor"],
    issueNumber: row.issue_number ?? undefined,
    issueUrl: row.issue_url ?? undefined,
    prNumber: row.pr_number ?? undefined,
    prUrl: row.pr_url ?? undefined,
    planningIssueUrl: row.planning_issue_url ?? undefined,
    trackerIssueUrl: row.tracker_issue_url ?? undefined,
    title: row.title ?? undefined,
    status: row.status as WorkflowRunStatus,
    createdAt: row.created_at,
    statusUpdatedAt: row.status_updated_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

export class SqliteWorkflowRunStore implements WorkflowRunStore {
  private createStmt: Database.Statement;
  private getStmt: Database.Statement;
  private updateStatusStmt: Database.Statement;
  private updateIssueStmt: Database.Statement;
  private updatePrStmt: Database.Statement;
  private listStmt: Database.Statement;
  private findByIssueStmt: Database.Statement;
  private progressStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.createStmt = db.prepare(`
      INSERT INTO workflow_runs
        (id, kind, idea_id, task_id, project_id, repo, executor,
         issue_number, issue_url, pr_number, pr_url,
         planning_issue_url, tracker_issue_url, title,
         status, created_at, status_updated_at, completed_at)
      VALUES
        (@id, @kind, @ideaId, @taskId, @projectId, @repo, @executor,
         @issueNumber, @issueUrl, @prNumber, @prUrl,
         @planningIssueUrl, @trackerIssueUrl, @title,
         @status, @createdAt, @statusUpdatedAt, @completedAt)
      ON CONFLICT(id) DO NOTHING
    `);
    this.getStmt = db.prepare("SELECT * FROM workflow_runs WHERE id = ?");
    this.updateStatusStmt = db.prepare(
      "UPDATE workflow_runs SET status = ?, status_updated_at = ? WHERE id = ?"
    );
    this.updateIssueStmt = db.prepare(
      "UPDATE workflow_runs SET issue_number = ?, issue_url = ? WHERE id = ?"
    );
    this.updatePrStmt = db.prepare(
      "UPDATE workflow_runs SET pr_number = ?, pr_url = ? WHERE id = ?"
    );
    this.listStmt = db.prepare(
      "SELECT * FROM workflow_runs ORDER BY created_at DESC"
    );
    this.findByIssueStmt = db.prepare(
      "SELECT * FROM workflow_runs WHERE repo = ? AND issue_number = ? LIMIT 1"
    );
    this.progressStmt = db.prepare(
      "SELECT * FROM plan_progress_v WHERE idea_id = ?"
    );
  }

  create(record: WorkflowRunRecord): void {
    this.createStmt.run({
      id: record.id,
      kind: record.kind,
      ideaId: record.ideaId ?? null,
      taskId: record.taskId ?? null,
      projectId: record.projectId ?? null,
      repo: record.repo ?? null,
      executor: record.executor ?? null,
      issueNumber: record.issueNumber ?? null,
      issueUrl: record.issueUrl ?? null,
      prNumber: record.prNumber ?? null,
      prUrl: record.prUrl ?? null,
      planningIssueUrl: record.planningIssueUrl ?? null,
      trackerIssueUrl: record.trackerIssueUrl ?? null,
      title: record.title ?? null,
      status: record.status,
      createdAt: record.createdAt,
      statusUpdatedAt: record.statusUpdatedAt ?? null,
      completedAt: record.completedAt ?? null,
    });
  }

  get(id: string): WorkflowRunRecord | null {
    const row = this.getStmt.get(id) as RunRow | undefined;
    return row ? toRecord(row) : null;
  }

  updateStatus(id: string, status: WorkflowRunRecord["status"], statusUpdatedAt?: string): void {
    this.updateStatusStmt.run(status, statusUpdatedAt ?? new Date().toISOString(), id);
  }

  updateIssue(id: string, issueNumber: string, issueUrl: string): void {
    this.updateIssueStmt.run(issueNumber, issueUrl, id);
  }

  updatePr(id: string, prNumber: string, prUrl: string): void {
    this.updatePrStmt.run(prNumber, prUrl, id);
  }

  list(filter?: { kind?: "plan" | "task"; ideaId?: string; status?: string }): WorkflowRunRecord[] {
    const { kind, ideaId, status } = filter ?? {};

    // Build query dynamically — small set of combinations, no user input reaches SQL
    const conditions: string[] = [];
    const params: string[] = [];
    if (kind) { conditions.push("kind = ?"); params.push(kind); }
    if (ideaId) { conditions.push("idea_id = ?"); params.push(ideaId); }
    if (status) { conditions.push("status = ?"); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db.prepare(
      `SELECT * FROM workflow_runs ${where} ORDER BY created_at DESC`
    ).all(...params) as RunRow[];

    return rows.map(toRecord);
  }

  findByIssue(repo: string, issueNumber: string): WorkflowRunRecord | null {
    const row = this.findByIssueStmt.get(repo, issueNumber) as RunRow | undefined;
    return row ? toRecord(row) : null;
  }

  planProgress(ideaId: string): PlanProgressRollup {
    const row = this.progressStmt.get(ideaId) as ProgressRow | undefined;
    return {
      ideaId,
      total: row?.total ?? 0,
      merged: row?.merged ?? 0,
      needsReview: row?.needs_review ?? 0,
      failed: row?.failed ?? 0,
    };
  }
}
