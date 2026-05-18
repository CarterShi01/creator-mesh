import { Octokit } from "@octokit/rest";
import type {
  CreateIssueResult,
  CreateIssueCommentResult,
  IssueData,
  PrData,
  WorkflowRunData,
  parseRepo,
} from "./types.js";
import { parseRepo as _parseRepo } from "./types.js";

export interface GitHubClientConfig {
  token: string;
}

/**
 * Typed wrapper around Octokit.
 * All methods accept a full "owner/repo" string and parse it internally.
 * No business logic lives here — pure GitHub API mapping.
 */
export class GitHubClient {
  private readonly octokit: Octokit;

  constructor(config: GitHubClientConfig) {
    this.octokit = new Octokit({ auth: config.token });
  }

  // ── Issues ────────────────────────────────────────────────────────────────

  async createIssue(
    fullRepo: string,
    title: string,
    body: string,
    labels?: string[]
  ): Promise<CreateIssueResult> {
    const { owner, repo } = _parseRepo(fullRepo);
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });
    return {
      issueNumber: data.number,
      issueUrl: data.html_url,
      nodeId: data.node_id,
    };
  }

  async addIssueComment(
    fullRepo: string,
    issueNumber: number,
    body: string
  ): Promise<CreateIssueCommentResult> {
    const { owner, repo } = _parseRepo(fullRepo);
    const { data } = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    return { commentId: data.id, commentUrl: data.html_url };
  }

  async getIssue(fullRepo: string, issueNumber: number): Promise<IssueData> {
    const { owner, repo } = _parseRepo(fullRepo);
    const { data } = await this.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    return {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      body: data.body ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateIssue(
    fullRepo: string,
    issueNumber: number,
    patch: { body?: string; title?: string; state?: "open" | "closed" }
  ): Promise<void> {
    const { owner, repo } = _parseRepo(fullRepo);
    await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...patch,
    });
  }

  // ── Pull Requests ─────────────────────────────────────────────────────────

  async listPullRequests(
    fullRepo: string,
    opts: { state?: "open" | "closed" | "all"; head?: string; limit?: number } = {}
  ): Promise<PrData[]> {
    const { owner, repo } = _parseRepo(fullRepo);
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: opts.state ?? "all",
      head: opts.head ? `${owner}:${opts.head}` : undefined,
      per_page: opts.limit ?? 100,
    });
    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? "merged" : pr.state,
      url: pr.html_url,
      mergedAt: pr.merged_at ?? null,
      headRefName: pr.head.ref,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      isDraft: pr.draft ?? false,
    }));
  }

  /**
   * Find PRs related to a given issue number.
   * Strategy: list all recent PRs and filter by head branch pattern (issue-{n})
   * plus a text search query for PRs that reference the issue.
   */
  async findPrsForIssue(fullRepo: string, issueNumber: number): Promise<PrData[]> {
    const { owner, repo } = _parseRepo(fullRepo);

    // Strategy 1: branch name convention "issue-{n}" (used by Claude Code)
    const byBranch = await this.listPullRequests(fullRepo, {
      head: `issue-${issueNumber}`,
      state: "all",
    });

    if (byBranch.length > 0) return byBranch;

    // Strategy 2: GitHub search API for PRs that close/fix the issue
    const { data: searchResult } = await this.octokit.rest.search.issuesAndPullRequests({
      q: `is:pr repo:${owner}/${repo} #${issueNumber}`,
      per_page: 20,
    });

    return searchResult.items.map((item) => ({
      number: item.number,
      title: item.title,
      state: item.pull_request?.merged_at ? "merged" : item.state,
      url: item.html_url,
      mergedAt: item.pull_request?.merged_at ?? null,
      headRefName: "",
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isDraft: false,
    }));
  }

  // ── Workflow Runs ─────────────────────────────────────────────────────────

  async listWorkflowRuns(
    fullRepo: string,
    opts: { workflowName?: string; event?: string; limit?: number } = {}
  ): Promise<WorkflowRunData[]> {
    const { owner, repo } = _parseRepo(fullRepo);

    if (opts.workflowName) {
      // Look up workflow by name first
      const { data: workflows } = await this.octokit.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });
      const workflow = workflows.workflows.find(
        (w) => w.name === opts.workflowName || w.path.includes(opts.workflowName!)
      );
      if (!workflow) return [];

      const { data } = await this.octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflow.id,
        event: opts.event,
        per_page: opts.limit ?? 100,
      });
      return data.workflow_runs.map(toWorkflowRunData);
    }

    const { data } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      event: opts.event,
      per_page: opts.limit ?? 100,
    });
    return data.workflow_runs.map(toWorkflowRunData);
  }
}

function toWorkflowRunData(run: {
  id: number;
  display_title: string;
  status: string | null;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  event: string;
  head_branch: string | null;
}): WorkflowRunData {
  return {
    databaseId: run.id,
    displayTitle: run.display_title,
    status: run.status ?? "unknown",
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    url: run.html_url,
    event: run.event,
    headBranch: run.head_branch,
  };
}
