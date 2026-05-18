import { randomUUID } from "node:crypto";
import type {
  CapabilityRegistry,
  ConnectorAction,
  ConnectorPort,
  ConnectorResult,
  Capability,
} from "../port.js";
import type { CapabilityType } from "../types.js";
import { GitHubClient, type GitHubClientConfig } from "./client.js";
import { GITHUB_CAPABILITIES } from "./capabilities.js";
import type {
  CreateIssuePayload,
  CreateIssueCommentPayload,
  ReadIssuePayload,
  UpdateIssuePayload,
  SearchPrPayload,
  SearchPrResult,
  SearchWorkflowRunPayload,
  SearchWorkflowRunResult,
} from "./types.js";

export interface GitHubConnectorConfig extends GitHubClientConfig {
  connectorId?: string;
}

class GitHubCapabilityRegistry implements CapabilityRegistry {
  readonly connectorId: string;
  readonly capabilities: Capability[];

  constructor(connectorId: string) {
    this.connectorId = connectorId;
    this.capabilities = GITHUB_CAPABILITIES;
  }

  supports(type: CapabilityType, resourceType?: string): boolean {
    return this.capabilities.some(
      (c) => c.type === type && (resourceType == null || c.resourceType === resourceType)
    );
  }

  get(type: CapabilityType, resourceType?: string): Capability | undefined {
    return this.capabilities.find(
      (c) => c.type === type && (resourceType == null || c.resourceType === resourceType)
    );
  }
}

export class GitHubConnectorAdapter implements ConnectorPort {
  readonly connectorId: string;
  private readonly client: GitHubClient;
  private readonly registry: GitHubCapabilityRegistry;

  constructor(config: GitHubConnectorConfig) {
    this.connectorId = config.connectorId ?? "github";
    this.client = new GitHubClient({ token: config.token });
    this.registry = new GitHubCapabilityRegistry(this.connectorId);
  }

  capabilities(): CapabilityRegistry {
    return this.registry;
  }

  async execute(action: ConnectorAction): Promise<ConnectorResult> {
    const base = {
      connectorId: this.connectorId,
      action,
      completedAt: new Date(),
      auditId: randomUUID(),
    };

    try {
      const data = await this.dispatch(action);
      return { ...base, status: "success", data };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ...base, status: "failure", error };
    }
  }

  private async dispatch(action: ConnectorAction): Promise<unknown> {
    const { type } = action.capability;
    const { resourceType, resourceId, payload } = action;
    const p = payload ?? {};

    if (type === "read" && resourceType === "issue") {
      const { repo, issueNumber } = p as unknown as ReadIssuePayload;
      return this.client.getIssue(repo, issueNumber);
    }

    if (type === "create" && resourceType === "issue") {
      const { repo, title, body, labels } = p as unknown as CreateIssuePayload;
      return this.client.createIssue(repo, title, body, labels);
    }

    if (type === "create" && resourceType === "issue-comment") {
      const { repo, issueNumber, body } = p as unknown as CreateIssueCommentPayload;
      return this.client.addIssueComment(repo, issueNumber, body);
    }

    if (type === "update" && resourceType === "issue") {
      const { repo, issueNumber, body, title, state } = p as unknown as UpdateIssuePayload;
      await this.client.updateIssue(repo, issueNumber, { body, title, state });
      return { updated: true, issueNumber };
    }

    if (type === "search" && resourceType === "pull-request") {
      const { repo, state, headBranch, limit } = p as unknown as SearchPrPayload;
      const prs = headBranch
        ? await this.client.listPullRequests(repo, { state, head: headBranch, limit })
        : await this.client.listPullRequests(repo, { state, limit });
      return { prs } satisfies SearchPrResult;
    }

    if (type === "search" && resourceType === "workflow-run") {
      const { repo, workflowName, event, limit } = p as unknown as SearchWorkflowRunPayload;
      const runs = await this.client.listWorkflowRuns(repo, { workflowName, event, limit });
      return { runs } satisfies SearchWorkflowRunResult;
    }

    throw new Error(`github.unsupported: ${type}/${resourceType}`);
  }
}
