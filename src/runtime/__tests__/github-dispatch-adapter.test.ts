import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";

// Mock the GitHub connector so no real API calls are made
vi.mock("../../capabilities/connectors/github/index.js", () => ({
  createGitHubConnector: vi.fn(() => ({
    service: {
      dispatchTask: vi.fn().mockResolvedValue({
        issueNumber: 42,
        issueUrl: "https://github.com/CarterShi01/idea-factory/issues/42",
        runId: "test-run-id",
      }),
      checkRunStatus: vi.fn().mockResolvedValue({
        overall: "merged",
        issueState: "closed",
        pr: {
          number: 10,
          title: "Fix feature",
          state: "merged",
          url: "https://github.com/CarterShi01/idea-factory/pull/10",
          mergedAt: "2026-05-17T19:00:00Z",
          headRefName: "issue-42",
          createdAt: "2026-05-17T18:00:00Z",
          updatedAt: "2026-05-17T19:00:00Z",
          isDraft: false,
        },
        workflowRun: {
          databaseId: 1,
          displayTitle: "Fix feature",
          status: "completed",
          conclusion: "success",
          createdAt: "2026-05-17T18:00:00Z",
          updatedAt: "2026-05-17T18:30:00Z",
          url: "https://github.com/CarterShi01/creator-mesh/actions/runs/1",
          event: "issue_comment",
          headBranch: "issue-42",
        },
      }),
    },
  })),
}));

// Provide a fake projects.yaml in a temp dir
const tmpDir = path.join(os.tmpdir(), "cm-adapter-test-" + Date.now());
const projectsFile = path.join(tmpDir, "projects.yaml");
const runsFile = path.join(tmpDir, "runs.jsonl");

process.env["CREATORMESH_PROJECTS_FILE"] = projectsFile;
process.env["CREATORMESH_RUNS_FILE"] = runsFile;

// Import adapter AFTER mocks and env vars are set
import { checkRunStatus, createClaudeTask } from "../adapters/github-dispatch-adapter.js";

const FAKE_PROJECTS_YAML = `
projects:
  - id: idea-factory
    repo: CarterShi01/idea-factory
    default_branch: master
    executor: claude-code
    allow_direct_merge: false
    allow_deploy: false
`;

describe("github-dispatch-adapter", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(projectsFile, FAKE_PROJECTS_YAML, "utf-8");
    // Remove runs file if it exists so each test starts fresh
    await fs.rm(runsFile, { force: true });
  });

  describe("checkRunStatus", () => {
    it("returns { output: string } with overall status", async () => {
      const result = await checkRunStatus("idea-factory", 42);
      expect(result).toHaveProperty("output");
      expect(typeof result.output).toBe("string");
    });

    it("output contains 'overall: merged'", async () => {
      const result = await checkRunStatus("idea-factory", 42);
      expect(result.output).toContain("overall: merged");
    });

    it("output contains pr_number and pr_url", async () => {
      const result = await checkRunStatus("idea-factory", 42);
      expect(result.output).toContain("pr_number: 10");
      expect(result.output).toContain("pr_url:");
    });

    it("output contains workflow_status", async () => {
      const result = await checkRunStatus("idea-factory", 42);
      expect(result.output).toContain("workflow_status: completed");
    });

    it("accepts numeric issueNumber", async () => {
      await expect(checkRunStatus("idea-factory", 42)).resolves.toHaveProperty("output");
    });

    it("accepts string issueNumber", async () => {
      await expect(checkRunStatus("idea-factory", "42")).resolves.toHaveProperty("output");
    });

    it("throws for unknown projectId", async () => {
      await expect(checkRunStatus("no-such-project", 1)).rejects.toThrow(
        'Project not found in registry: "no-such-project"'
      );
    });
  });

  describe("createClaudeTask", () => {
    it("returns { stdout, stderr } with dispatch info", async () => {
      const result = await createClaudeTask("idea-factory", "Test task", "Body text");
      expect(result).toHaveProperty("stdout");
      expect(result).toHaveProperty("stderr");
      expect(result.stderr).toBe("");
    });

    it("stdout contains issue URL", async () => {
      const result = await createClaudeTask("idea-factory", "Test task", "Body text");
      expect(result.stdout).toContain("https://github.com/CarterShi01/idea-factory/issues/42");
    });

    it("stdout contains project and repo info", async () => {
      const result = await createClaudeTask("idea-factory", "Test task", "Body text");
      expect(result.stdout).toContain("idea-factory");
      expect(result.stdout).toContain("CarterShi01/idea-factory");
    });

    it("writes a record to runs.jsonl for bridge compat", async () => {
      await createClaudeTask("idea-factory", "Bridge test", "Body");
      const content = await fs.readFile(runsFile, "utf-8");
      const record = JSON.parse(content.trim());
      expect(record.project_id).toBe("idea-factory");
      expect(record.issue_number).toBe("42");
      expect(record.status).toBe("dispatched");
    });

    it("throws for unknown projectId", async () => {
      await expect(createClaudeTask("no-such-project", "T", "B")).rejects.toThrow(
        'Project not found in registry: "no-such-project"'
      );
    });
  });
});
