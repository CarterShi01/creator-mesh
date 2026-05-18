// Typed payload and result shapes for every GitHub connector capability.
// These are not part of the ConnectorPort contract — they're cast helpers.

export interface RepoRef {
  owner: string;
  repo: string;
}

/** Parse "owner/name" into { owner, repo }. */
export function parseRepo(fullName: string): RepoRef {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo format: "${fullName}" — expected "owner/name"`);
  return { owner, repo };
}

// ── create.issue ─────────────────────────────────────────────────────────────

export interface CreateIssuePayload {
  repo: string; // "owner/name"
  title: string;
  body: string;
  labels?: string[];
}

export interface CreateIssueResult {
  issueNumber: number;
  issueUrl: string;
  nodeId: string;
}

// ── create.issue-comment ─────────────────────────────────────────────────────

export interface CreateIssueCommentPayload {
  repo: string;
  issueNumber: number;
  body: string;
}

export interface CreateIssueCommentResult {
  commentId: number;
  commentUrl: string;
}

// ── read.issue ────────────────────────────────────────────────────────────────

export interface ReadIssuePayload {
  repo: string;
  issueNumber: number;
}

export interface IssueData {
  number: number;
  title: string;
  state: string; // "open" | "closed"
  url: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── update.issue ──────────────────────────────────────────────────────────────

export interface UpdateIssuePayload {
  repo: string;
  issueNumber: number;
  body?: string;
  title?: string;
  state?: "open" | "closed";
}

// ── search.pull-request ───────────────────────────────────────────────────────

export interface SearchPrPayload {
  repo: string;
  state?: "open" | "closed" | "all";
  search?: string; // additional search qualifier
  headBranch?: string; // filter by head ref
  limit?: number;
}

export interface PrData {
  number: number;
  title: string;
  state: string; // "open" | "closed" | "merged"
  url: string;
  mergedAt: string | null;
  headRefName: string;
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
}

export interface SearchPrResult {
  prs: PrData[];
}

// ── search.workflow-run ───────────────────────────────────────────────────────

export interface SearchWorkflowRunPayload {
  repo: string;
  workflowName?: string; // e.g. "Claude Code"
  event?: string; // e.g. "issue_comment"
  limit?: number;
}

export interface WorkflowRunData {
  databaseId: number;
  displayTitle: string;
  status: string; // "queued" | "in_progress" | "completed"
  conclusion: string | null; // "success" | "failure" | "cancelled" | null
  createdAt: string;
  updatedAt: string;
  url: string;
  event: string;
  headBranch: string | null;
}

export interface SearchWorkflowRunResult {
  runs: WorkflowRunData[];
}
