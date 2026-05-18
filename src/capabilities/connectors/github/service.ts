import { randomUUID } from "node:crypto";
import type { GitHubConnectorAdapter } from "./adapter.js";
import type { GitHubClient } from "./client.js";
import type { PrData, WorkflowRunData } from "./types.js";
import type { WorkflowRunStore } from "../../../storage/ports/workflow-run-store.js";
import type { WorkflowRunRecord } from "../../../storage/types.js";
import type { WorkflowRunStatus } from "../../../workflows/types.js";

export interface DispatchTaskOptions {
  /** "owner/name" */
  repo: string;
  title: string;
  body: string;
  /** Custom @claude prompt; defaults to the standard task prompt. */
  claudePrompt?: string;
  planId?: string;
  taskId?: string;
  kind?: "plan" | "task";
  projectId?: string;
  executor?: string;
}

export interface DispatchTaskResult {
  issueNumber: number;
  issueUrl: string;
  runId: string;
}

export interface RunStatus {
  overall: WorkflowRunStatus;
  issueState?: string;
  pr?: PrData;
  workflowRun?: WorkflowRunData;
}

const DEFAULT_CLAUDE_PROMPT =
  "@claude Please implement the task described in this issue. " +
  "Keep the change small and focused. " +
  "Do not merge automatically; create or update a pull request for human review.";

/**
 * High-level orchestration service for GitHub-based task dispatch.
 * Composes GitHubConnectorAdapter + WorkflowRunStore.
 *
 * This is the TypeScript replacement for the Phase 1 shell scripts:
 *   - create_claude_task.sh  → dispatchTask()
 *   - dispatch_plan.sh       → createTrackerIssue() + dispatchTask() per task
 *   - check_run_status.sh    → checkRunStatus()
 *   - plan_progress.sh       → refreshTracker()
 */
export class GitHubDispatchService {
  // Expose client for callers that need raw GitHub access
  readonly client: GitHubClient;

  constructor(
    private readonly adapter: GitHubConnectorAdapter,
    private readonly runStore?: WorkflowRunStore
  ) {
    // Access the underlying client via a type cast; the client is always created
    // inside GitHubConnectorAdapter and reachable this way for test injection.
    this.client = (adapter as unknown as { client: GitHubClient }).client;
  }

  /**
   * Create a GitHub issue and add an @claude trigger comment.
   * Stores a WorkflowRun record in the run store if one is provided.
   */
  async dispatchTask(opts: DispatchTaskOptions): Promise<DispatchTaskResult> {
    const execResult = await this.adapter.execute({
      connectorId: this.adapter.connectorId,
      capability: this.adapter.capabilities().get("create", "issue")!,
      resourceType: "issue",
      payload: {
        repo: opts.repo,
        title: opts.title,
        body: opts.body,
      },
      requestedAt: new Date(),
      status: "approved",
    });

    if (execResult.status !== "success") {
      throw new Error(`GitHub issue creation failed: ${execResult.error}`);
    }

    const { issueNumber, issueUrl } = execResult.data as { issueNumber: number; issueUrl: string };

    // Add @claude trigger comment
    await this.adapter.execute({
      connectorId: this.adapter.connectorId,
      capability: this.adapter.capabilities().get("create", "issue-comment")!,
      resourceType: "issue-comment",
      payload: {
        repo: opts.repo,
        issueNumber,
        body: opts.claudePrompt ?? DEFAULT_CLAUDE_PROMPT,
      },
      requestedAt: new Date(),
      status: "approved",
    });

    const runId = randomUUID();

    if (this.runStore) {
      const record: WorkflowRunRecord = {
        id: runId,
        kind: opts.kind ?? "task",
        ideaId: opts.planId ?? undefined,
        taskId: opts.taskId ?? undefined,
        projectId: opts.projectId ?? undefined,
        repo: opts.repo,
        executor: (opts.executor ?? "claude-code") as WorkflowRunRecord["executor"],
        issueNumber: String(issueNumber),
        issueUrl,
        title: opts.title,
        status: "dispatched",
        createdAt: new Date().toISOString(),
      };
      this.runStore.create(record);
    }

    return { issueNumber, issueUrl, runId };
  }

  /**
   * Create a plan tracker issue (used to track overall plan progress).
   * Equivalent to the tracker issue creation in dispatch_plan.sh.
   */
  async createTrackerIssue(opts: {
    repo: string;
    planTitle: string;
    body: string;
  }): Promise<{ issueNumber: number; issueUrl: string }> {
    const execResult = await this.adapter.execute({
      connectorId: this.adapter.connectorId,
      capability: this.adapter.capabilities().get("create", "issue")!,
      resourceType: "issue",
      payload: {
        repo: opts.repo,
        title: `Plan Tracker: ${opts.planTitle}`,
        body: opts.body,
        labels: ["plan-tracker"],
      },
      requestedAt: new Date(),
      status: "approved",
    });

    if (execResult.status !== "success") {
      throw new Error(`Tracker issue creation failed: ${execResult.error}`);
    }

    return execResult.data as { issueNumber: number; issueUrl: string };
  }

  /**
   * Check the execution status of a dispatched task.
   * Equivalent to check_run_status.sh — returns a WorkflowRunStatus token.
   *
   * Priority:
   *   1. Merged PR → "merged"
   *   2. Open PR + workflow completed → "needs_human_review"
   *   3. Closed PR without merge → "pr_closed_without_merge"
   *   4. No PR + workflow in_progress → "workflow_running"
   *   5. No PR + workflow completed (success) → "waiting_for_pr"
   *   6. No PR + workflow failed/cancelled → "workflow_failed"
   *   7. No PR + no workflow run → "waiting_for_workflow"
   *   8. Fallback → "unknown"
   */
  async checkRunStatus(opts: {
    repo: string;
    issueNumber: number;
  }): Promise<RunStatus> {
    const [issue, prs, workflowRuns] = await Promise.all([
      this.client.getIssue(opts.repo, opts.issueNumber).catch(() => null),
      this.client.findPrsForIssue(opts.repo, opts.issueNumber).catch(() => [] as PrData[]),
      this.client
        .listWorkflowRuns(opts.repo, {
          workflowName: "Claude Code",
          event: "issue_comment",
          limit: 50,
        })
        .catch(() => [] as WorkflowRunData[]),
    ]);

    // Find the most relevant PR (prefer merged, then most-recently-updated)
    const mergedPr = prs.find((p) => p.mergedAt !== null);
    const openPr = prs.find((p) => p.state === "open");
    const closedPr = prs.find((p) => p.state === "closed" && !p.mergedAt);
    const bestPr = mergedPr ?? openPr ?? closedPr ?? prs[0];

    // Find the most recent Claude Code workflow run for this issue
    // Match by: headBranch contains issue number, or displayTitle contains issue number
    const issueRef = String(opts.issueNumber);
    const matchingRun = workflowRuns.find(
      (r) =>
        r.headBranch?.includes(`issue-${issueRef}`) ||
        r.displayTitle.includes(`#${issueRef}`) ||
        r.displayTitle.toLowerCase().includes(issueRef)
    );

    // Derive overall status
    if (mergedPr) {
      return { overall: "merged", issueState: issue?.state, pr: mergedPr, workflowRun: matchingRun };
    }

    if (openPr) {
      return {
        overall: "needs_human_review",
        issueState: issue?.state,
        pr: openPr,
        workflowRun: matchingRun,
      };
    }

    if (closedPr) {
      return {
        overall: "pr_closed_without_merge",
        issueState: issue?.state,
        pr: closedPr,
        workflowRun: matchingRun,
      };
    }

    // No PR yet — look at workflow run
    if (matchingRun) {
      if (matchingRun.status === "in_progress" || matchingRun.status === "queued") {
        return { overall: "workflow_running", issueState: issue?.state, workflowRun: matchingRun };
      }
      if (matchingRun.status === "completed") {
        if (matchingRun.conclusion === "success") {
          return { overall: "waiting_for_pr", issueState: issue?.state, workflowRun: matchingRun };
        }
        return { overall: "workflow_failed", issueState: issue?.state, workflowRun: matchingRun };
      }
    }

    if (issue?.state === "closed") {
      return { overall: "pr_closed_without_merge", issueState: "closed" };
    }

    return {
      overall: prs.length === 0 && !matchingRun ? "waiting_for_workflow" : "unknown",
      issueState: issue?.state ?? undefined,
      workflowRun: matchingRun,
    };
  }

  /**
   * Refresh a plan tracker issue body with updated progress.
   * Equivalent to `gh issue edit --body-file` in plan_progress.sh.
   */
  async refreshTracker(opts: {
    repo: string;
    issueNumber: number;
    body: string;
  }): Promise<void> {
    await this.adapter.execute({
      connectorId: this.adapter.connectorId,
      capability: this.adapter.capabilities().get("update", "issue")!,
      resourceType: "issue",
      payload: {
        repo: opts.repo,
        issueNumber: opts.issueNumber,
        body: opts.body,
      },
      requestedAt: new Date(),
      status: "approved",
    });
  }
}
