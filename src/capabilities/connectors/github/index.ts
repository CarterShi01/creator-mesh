import { GitHubConnectorAdapter } from "./adapter.js";
import { GitHubDispatchService } from "./service.js";
import type { WorkflowRunStore } from "../../../storage/ports/workflow-run-store.js";

export { GitHubConnectorAdapter } from "./adapter.js";
export type { GitHubConnectorConfig } from "./adapter.js";
export { GitHubDispatchService } from "./service.js";
export type { DispatchTaskOptions, DispatchTaskResult, RunStatus } from "./service.js";
export { GitHubClient } from "./client.js";
export type { GitHubClientConfig } from "./client.js";
export { GITHUB_CAPABILITIES } from "./capabilities.js";
export type {
  CreateIssuePayload,
  CreateIssueResult,
  CreateIssueCommentPayload,
  CreateIssueCommentResult,
  ReadIssuePayload,
  IssueData,
  UpdateIssuePayload,
  SearchPrPayload,
  PrData,
  SearchPrResult,
  SearchWorkflowRunPayload,
  WorkflowRunData,
  SearchWorkflowRunResult,
} from "./types.js";

export interface CreateGitHubConnectorOptions {
  token?: string;
  connectorId?: string;
  runStore?: WorkflowRunStore;
}

/**
 * Factory: creates a GitHubConnectorAdapter and GitHubDispatchService
 * from environment variables or explicit config.
 * Requires GITHUB_TOKEN env var unless token is passed explicitly.
 */
export function createGitHubConnector(opts?: CreateGitHubConnectorOptions): {
  adapter: GitHubConnectorAdapter;
  service: GitHubDispatchService;
} {
  const token = opts?.token ?? process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not set. " +
        "Set it to a GitHub personal access token with repo scope."
    );
  }
  const adapter = new GitHubConnectorAdapter({ token, connectorId: opts?.connectorId });
  const service = new GitHubDispatchService(adapter, opts?.runStore);
  return { adapter, service };
}
