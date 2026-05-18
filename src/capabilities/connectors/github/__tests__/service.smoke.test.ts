import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubDispatchService } from "../service.js";
import type { GitHubConnectorAdapter } from "../adapter.js";
import type { WorkflowRunStore } from "../../../../storage/ports/workflow-run-store.js";
import type { WorkflowRunRecord, PlanProgressRollup } from "../../../../storage/types.js";

// Minimal mock adapter
function makeMockAdapter(executeOverride?: ReturnType<typeof vi.fn>): GitHubConnectorAdapter {
  return {
    connectorId: "github",
    capabilities: () => ({
      connectorId: "github",
      capabilities: [],
      supports: () => true,
      get: (type: string, resourceType: string) => ({
        id: `github.${type}.${resourceType}`,
        type,
        resourceType,
        permissionLevel: "write",
        approvalRequirement: "conditional",
        reversible: false,
        description: "mock",
      }),
    }),
    execute: executeOverride ?? vi.fn().mockResolvedValue({
      status: "success",
      data: {},
      auditId: "x",
      completedAt: new Date(),
      action: {},
    }),
  } as unknown as GitHubConnectorAdapter;
}

function makeMockRunStore(): WorkflowRunStore {
  return {
    create: vi.fn(),
    get: vi.fn().mockReturnValue(null),
    updateStatus: vi.fn(),
    updateIssue: vi.fn(),
    updatePr: vi.fn(),
    list: vi.fn().mockReturnValue([]),
    findByIssue: vi.fn().mockReturnValue(null),
    planProgress: vi.fn().mockReturnValue({ ideaId: "test", total: 0, merged: 0, needsReview: 0, failed: 0 } satisfies PlanProgressRollup),
  };
}

describe("GitHubDispatchService", () => {
  let adapter: ReturnType<typeof makeMockAdapter>;
  let runStore: WorkflowRunStore;
  let service: GitHubDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = makeMockAdapter(
      vi.fn().mockResolvedValue({
        status: "success",
        data: { issueNumber: 7, issueUrl: "https://github.com/owner/repo/issues/7", nodeId: "n" },
        auditId: "a1",
        completedAt: new Date(),
        action: {},
      })
    );
    runStore = makeMockRunStore();
    service = new GitHubDispatchService(adapter, runStore);
  });

  it("dispatchTask calls execute twice (issue + comment)", async () => {
    const result = await service.dispatchTask({
      repo: "owner/repo",
      title: "T01",
      body: "Add stable id",
    });
    expect(adapter.execute).toHaveBeenCalledTimes(2);
    expect(result.issueNumber).toBe(7);
    expect(result.issueUrl).toContain("/issues/7");
    expect(result.runId).toBeTruthy();
  });

  it("dispatchTask stores WorkflowRun record with correct fields", async () => {
    await service.dispatchTask({
      repo: "owner/repo",
      title: "T01",
      body: "Body",
      planId: "2026-05-18-idea-ranking",
      taskId: "T01",
      projectId: "idea-factory",
    });
    expect(runStore.create).toHaveBeenCalledOnce();
    const record = (runStore.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowRunRecord;
    expect(record.kind).toBe("task");
    expect(record.ideaId).toBe("2026-05-18-idea-ranking");
    expect(record.taskId).toBe("T01");
    expect(record.issueNumber).toBe("7");
    expect(record.status).toBe("dispatched");
  });

  it("dispatchTask works without a runStore (no crash)", async () => {
    const svc = new GitHubDispatchService(adapter);
    await expect(svc.dispatchTask({ repo: "owner/repo", title: "T", body: "B" }))
      .resolves.toMatchObject({ issueNumber: 7 });
  });

  it("dispatchTask throws if issue creation fails", async () => {
    (adapter.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "failure",
      error: "403 Forbidden",
      auditId: "a",
      completedAt: new Date(),
      action: {},
    });
    await expect(
      service.dispatchTask({ repo: "owner/repo", title: "T", body: "B" })
    ).rejects.toThrow("403 Forbidden");
  });

  it("createTrackerIssue prepends 'Plan Tracker:' to title", async () => {
    await service.createTrackerIssue({ repo: "owner/repo", planTitle: "Idea Ranking", body: "## Tasks" });
    const call = (adapter.execute as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.payload.title).toBe("Plan Tracker: Idea Ranking");
  });

  it("refreshTracker calls execute with update/issue", async () => {
    await service.refreshTracker({ repo: "owner/repo", issueNumber: 7, body: "## Updated" });
    const call = (adapter.execute as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.resourceType).toBe("issue");
    expect(call.capability.type).toBe("update");
    expect(call.payload.body).toBe("## Updated");
  });
});

describe("GitHubDispatchService.checkRunStatus", () => {
  it("returns 'merged' when a merged PR is found", async () => {
    const mockClient = {
      getIssue: vi.fn().mockResolvedValue({ number: 8, state: "closed", title: "T", url: "", body: "", createdAt: "", updatedAt: "" }),
      findPrsForIssue: vi.fn().mockResolvedValue([{
        number: 10, title: "Fix T", state: "merged",
        url: "https://github.com/owner/repo/pull/10",
        mergedAt: "2026-05-17T00:00:00Z",
        headRefName: "issue-8",
        createdAt: "", updatedAt: "", isDraft: false,
      }]),
      listWorkflowRuns: vi.fn().mockResolvedValue([]),
    };

    const adapter = makeMockAdapter();
    (adapter as unknown as { client: unknown }).client = mockClient;
    const svc = new GitHubDispatchService(adapter);
    const status = await svc.checkRunStatus({ repo: "owner/repo", issueNumber: 8 });
    expect(status.overall).toBe("merged");
    expect(status.pr?.mergedAt).toBeTruthy();
  });

  it("returns 'waiting_for_workflow' when no PR and no workflow run", async () => {
    const mockClient = {
      getIssue: vi.fn().mockResolvedValue({ number: 5, state: "open", title: "T", url: "", body: "", createdAt: "", updatedAt: "" }),
      findPrsForIssue: vi.fn().mockResolvedValue([]),
      listWorkflowRuns: vi.fn().mockResolvedValue([]),
    };
    const adapter = makeMockAdapter();
    (adapter as unknown as { client: unknown }).client = mockClient;
    const svc = new GitHubDispatchService(adapter);
    const status = await svc.checkRunStatus({ repo: "owner/repo", issueNumber: 5 });
    expect(status.overall).toBe("waiting_for_workflow");
  });

  it("returns 'workflow_running' when workflow is in_progress", async () => {
    const mockClient = {
      getIssue: vi.fn().mockResolvedValue({ number: 5, state: "open", title: "T", url: "", body: "", createdAt: "", updatedAt: "" }),
      findPrsForIssue: vi.fn().mockResolvedValue([]),
      listWorkflowRuns: vi.fn().mockResolvedValue([{
        databaseId: 1, displayTitle: "Add feature #5",
        status: "in_progress", conclusion: null,
        createdAt: "", updatedAt: "", url: "", event: "issue_comment", headBranch: "issue-5",
      }]),
    };
    const adapter = makeMockAdapter();
    (adapter as unknown as { client: unknown }).client = mockClient;
    const svc = new GitHubDispatchService(adapter);
    const status = await svc.checkRunStatus({ repo: "owner/repo", issueNumber: 5 });
    expect(status.overall).toBe("workflow_running");
  });

  it("returns 'needs_human_review' when PR is open", async () => {
    const mockClient = {
      getIssue: vi.fn().mockResolvedValue({ number: 5, state: "open", title: "T", url: "", body: "", createdAt: "", updatedAt: "" }),
      findPrsForIssue: vi.fn().mockResolvedValue([{
        number: 8, title: "Fix", state: "open",
        url: "https://github.com/owner/repo/pull/8",
        mergedAt: null, headRefName: "issue-5",
        createdAt: "", updatedAt: "", isDraft: false,
      }]),
      listWorkflowRuns: vi.fn().mockResolvedValue([]),
    };
    const adapter = makeMockAdapter();
    (adapter as unknown as { client: unknown }).client = mockClient;
    const svc = new GitHubDispatchService(adapter);
    const status = await svc.checkRunStatus({ repo: "owner/repo", issueNumber: 5 });
    expect(status.overall).toBe("needs_human_review");
  });
});
