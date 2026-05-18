import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubConnectorAdapter } from "../adapter.js";
import type { ConnectorAction } from "../../port.js";
import { GITHUB_CAPABILITIES } from "../capabilities.js";

// Mock @octokit/rest so tests run without a real GitHub token
vi.mock("@octokit/rest", () => {
  const Octokit = vi.fn().mockImplementation(() => ({
    rest: {
      issues: {
        create: vi.fn().mockResolvedValue({
          data: { number: 42, html_url: "https://github.com/owner/repo/issues/42", node_id: "abc" },
        }),
        createComment: vi.fn().mockResolvedValue({
          data: { id: 1, html_url: "https://github.com/owner/repo/issues/42#issuecomment-1" },
        }),
        get: vi.fn().mockResolvedValue({
          data: {
            number: 42,
            title: "Test issue",
            state: "open",
            html_url: "https://github.com/owner/repo/issues/42",
            body: "test body",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        }),
        update: vi.fn().mockResolvedValue({ data: {} }),
      },
      pulls: {
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { items: [] } }),
      },
      actions: {
        listRepoWorkflows: vi.fn().mockResolvedValue({
          data: { workflows: [{ id: 1, name: "Claude Code", path: ".github/workflows/claude.yml" }] },
        }),
        listWorkflowRuns: vi.fn().mockResolvedValue({ data: { workflow_runs: [] } }),
        listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { workflow_runs: [] } }),
      },
    },
  }));
  return { Octokit };
});

function makeAction(type: string, resourceType: string, payload: Record<string, unknown>): ConnectorAction {
  const cap = GITHUB_CAPABILITIES.find((c) => c.type === type && c.resourceType === resourceType)!;
  return {
    connectorId: "github",
    capability: cap,
    resourceType,
    payload,
    requestedAt: new Date(),
    status: "approved",
  };
}

describe("GitHubConnectorAdapter", () => {
  let adapter: GitHubConnectorAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GitHubConnectorAdapter({ token: "ghp_test" });
  });

  it("exposes connectorId = 'github'", () => {
    expect(adapter.connectorId).toBe("github");
  });

  it("capabilities() returns 6 capabilities", () => {
    expect(adapter.capabilities().capabilities).toHaveLength(6);
  });

  it("supports read/issue", () => {
    expect(adapter.capabilities().supports("read", "issue")).toBe(true);
  });

  it("supports create/issue and create/issue-comment", () => {
    expect(adapter.capabilities().supports("create", "issue")).toBe(true);
    expect(adapter.capabilities().supports("create", "issue-comment")).toBe(true);
  });

  it("supports update/issue", () => {
    expect(adapter.capabilities().supports("update", "issue")).toBe(true);
  });

  it("supports search/pull-request and search/workflow-run", () => {
    expect(adapter.capabilities().supports("search", "pull-request")).toBe(true);
    expect(adapter.capabilities().supports("search", "workflow-run")).toBe(true);
  });

  it("execute create/issue returns issueNumber and issueUrl", async () => {
    const action = makeAction("create", "issue", {
      repo: "owner/repo",
      title: "Test",
      body: "Body",
    });
    const result = await adapter.execute(action);
    expect(result.status).toBe("success");
    const data = result.data as { issueNumber: number; issueUrl: string };
    expect(data.issueNumber).toBe(42);
    expect(data.issueUrl).toContain("/issues/42");
  });

  it("execute read/issue returns issue data", async () => {
    const action = makeAction("read", "issue", { repo: "owner/repo", issueNumber: 42 });
    const result = await adapter.execute(action);
    expect(result.status).toBe("success");
    const data = result.data as { number: number; title: string };
    expect(data.number).toBe(42);
    expect(data.title).toBe("Test issue");
  });

  it("execute create/issue-comment returns commentId", async () => {
    const action = makeAction("create", "issue-comment", {
      repo: "owner/repo",
      issueNumber: 42,
      body: "@claude Please implement.",
    });
    const result = await adapter.execute(action);
    expect(result.status).toBe("success");
    const data = result.data as { commentId: number };
    expect(data.commentId).toBe(1);
  });

  it("execute search/pull-request returns empty prs array", async () => {
    const action = makeAction("search", "pull-request", { repo: "owner/repo" });
    const result = await adapter.execute(action);
    expect(result.status).toBe("success");
    const data = result.data as { prs: unknown[] };
    expect(Array.isArray(data.prs)).toBe(true);
  });

  it("execute unsupported capability returns failure", async () => {
    const badAction: ConnectorAction = {
      connectorId: "github",
      capability: GITHUB_CAPABILITIES[0],
      resourceType: "nonexistent-resource",
      payload: {},
      requestedAt: new Date(),
      status: "approved",
    };
    // Patch capability type
    (badAction.capability as { type: string }).type = "delete";
    const result = await adapter.execute(badAction);
    expect(result.status).toBe("failure");
    expect(result.error).toContain("github.unsupported");
  });

  it("execute returns auditId and completedAt on every response", async () => {
    const action = makeAction("read", "issue", { repo: "owner/repo", issueNumber: 1 });
    const result = await adapter.execute(action);
    expect(result.auditId).toBeTruthy();
    expect(result.completedAt).toBeInstanceOf(Date);
  });
});
