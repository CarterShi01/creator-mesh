import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";
import { promises as fs } from "fs";

// Mock the shell adapter (listProjects, listRuns still live here)
vi.mock("../adapters/shell-controller-adapter.js", () => ({
  listProjects: vi.fn().mockResolvedValue({
    projects: [
      { id: "idea-factory", repo: "CarterShi01/idea-factory", executor: "claude-code" },
    ],
  }),
  listRuns: vi.fn().mockResolvedValue({ output: "run1 dispatched\nrun2 merged" }),
}));

// Mock the GitHub dispatch adapter (checkRunStatus, createClaudeTask moved here in Phase 2)
vi.mock("../adapters/github-dispatch-adapter.js", () => ({
  checkRunStatus: vi.fn().mockResolvedValue({ output: "overall: merged\npr_number: 42\npr_url: https://github.com/CarterShi01/idea-factory/pull/42" }),
  createClaudeTask: vi.fn().mockResolvedValue({ stdout: "Dispatch completed.\nIssue: https://github.com/CarterShi01/idea-factory/issues/8", stderr: "" }),
}));

import { checkPermission } from "../policies/permission-policy.js";
import { getToolRegistry } from "../tools/tool-registry.js";
import { writeRuntimeEvents } from "../events/runtime-event-writer.js";
import { runRuntimeTurnWithClient, runRuntimeTurn } from "../loop/runtime-loop.js";
import type { RuntimeLLMClient, RuntimeToolDecision } from "../llm/runtime-llm-client.js";
import type { RuntimeEvent } from "../events/runtime-event.js";

function makeMockLLMClient(overrides: Partial<RuntimeToolDecision> = {}): RuntimeLLMClient {
  const decision: RuntimeToolDecision = {
    intent: overrides.intent ?? "list recent runs",
    toolName: overrides.toolName ?? "list_runs",
    toolArgs: overrides.toolArgs ?? {},
    confidence: overrides.confidence ?? 0.95,
    needsClarification: overrides.needsClarification ?? false,
    clarificationQuestion: overrides.clarificationQuestion,
  };
  return {
    decideTool: vi.fn().mockResolvedValue(decision),
  };
}

// ─── Permission Policy ────────────────────────────────────────────────────────

describe("checkPermission", () => {
  it("allows list_projects", () => expect(checkPermission("list_projects")).toBe("allowed"));
  it("allows list_runs", () => expect(checkPermission("list_runs")).toBe("allowed"));
  it("allows check_run_status", () => expect(checkPermission("check_run_status")).toBe("allowed"));
  it("requires approval for create_claude_task", () =>
    expect(checkPermission("create_claude_task")).toBe("needs_approval"));
  it("denies 'none'", () => expect(checkPermission("none")).toBe("denied"));
});

// ─── Tool Registry ────────────────────────────────────────────────────────────

describe("getToolRegistry", () => {
  it("contains all four ControllerPanel tools", () => {
    const registry = getToolRegistry();
    expect(registry.has("list_projects")).toBe(true);
    expect(registry.has("list_runs")).toBe(true);
    expect(registry.has("check_run_status")).toBe(true);
    expect(registry.has("create_claude_task")).toBe(true);
  });

  it("marks create_claude_task as requiresApproval", () => {
    expect(getToolRegistry().get("create_claude_task")?.requiresApproval).toBe(true);
  });

  it("marks read tools as not requiring approval", () => {
    const reg = getToolRegistry();
    expect(reg.get("list_projects")?.requiresApproval).toBeFalsy();
    expect(reg.get("list_runs")?.requiresApproval).toBeFalsy();
    expect(reg.get("check_run_status")?.requiresApproval).toBeFalsy();
  });
});

// ─── Event Writer ─────────────────────────────────────────────────────────────

describe("writeRuntimeEvents", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "creatormesh-events-test-"));
    process.env["CREATORMESH_EVENTS_DIR"] = tmpDir;
  });

  afterEach(async () => {
    delete process.env["CREATORMESH_EVENTS_DIR"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("appends a JSONL line for each event", async () => {
    const events: RuntimeEvent[] = [
      {
        id: "evt-1",
        sessionId: "sess-1",
        turnId: "turn-1",
        type: "input_received",
        message: "test",
        createdAt: new Date().toISOString(),
      },
      {
        id: "evt-2",
        sessionId: "sess-1",
        turnId: "turn-1",
        type: "response_created",
        message: "done",
        createdAt: new Date().toISOString(),
      },
    ];

    await writeRuntimeEvents(events);

    const content = await fs.readFile(path.join(tmpDir, "runtime-events.jsonl"), "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).id).toBe("evt-1");
    expect(JSON.parse(lines[1]!).id).toBe("evt-2");
  });

  it("creates the events directory if missing", async () => {
    const nested = path.join(tmpDir, "deep", "nested");
    process.env["CREATORMESH_EVENTS_DIR"] = nested;

    await writeRuntimeEvents([
      {
        id: "evt-3",
        sessionId: "s",
        turnId: "t",
        type: "input_received",
        createdAt: new Date().toISOString(),
      },
    ]);

    const stat = await fs.stat(path.join(nested, "runtime-events.jsonl"));
    expect(stat.isFile()).toBe(true);
  });

  it("is a no-op for an empty array", async () => {
    await writeRuntimeEvents([]);
    await expect(
      fs.stat(path.join(tmpDir, "runtime-events.jsonl"))
    ).rejects.toThrow();
  });
});

// ─── Missing API Key ──────────────────────────────────────────────────────────

describe("runRuntimeTurn — missing ANTHROPIC_API_KEY", () => {
  let savedKey: string | undefined;
  let tmpDir: string;

  beforeEach(async () => {
    savedKey = process.env["ANTHROPIC_API_KEY"];
    delete process.env["ANTHROPIC_API_KEY"];
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "creatormesh-run-test-"));
    process.env["CREATORMESH_EVENTS_DIR"] = tmpDir;
  });

  afterEach(async () => {
    if (savedKey !== undefined) process.env["ANTHROPIC_API_KEY"] = savedKey;
    else delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["CREATORMESH_EVENTS_DIR"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns failed status with a clear error message", async () => {
    const result = await runRuntimeTurn({ userInput: "show runs" });
    expect(result.status).toBe("failed");
    expect(result.finalResponse).toContain("ANTHROPIC_API_KEY");
  });

  it("records input_received event before config error", async () => {
    const result = await runRuntimeTurn({ userInput: "show runs" });
    expect(result.events.some((e) => e.type === "input_received")).toBe(true);
  });
});

// ─── list_runs — happy path ───────────────────────────────────────────────────

describe("runRuntimeTurnWithClient — list_runs", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "creatormesh-run-test-"));
    process.env["CREATORMESH_EVENTS_DIR"] = tmpDir;
  });

  afterEach(async () => {
    delete process.env["CREATORMESH_EVENTS_DIR"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns completed status", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "show recent runs" },
      makeMockLLMClient({ toolName: "list_runs" })
    );
    expect(result.status).toBe("completed");
  });

  it("sets selectedToolName to list_runs", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "show recent runs" },
      makeMockLLMClient({ toolName: "list_runs" })
    );
    expect(result.selectedToolName).toBe("list_runs");
  });

  it("records the full event sequence", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "show recent runs" },
      makeMockLLMClient({ toolName: "list_runs" })
    );
    const types = result.events.map((e) => e.type);
    expect(types).toContain("input_received");
    expect(types).toContain("llm_started");
    expect(types).toContain("llm_completed");
    expect(types).toContain("permission_checked");
    expect(types).toContain("tool_started");
    expect(types).toContain("tool_completed");
    expect(types).toContain("response_created");
  });

  it("records permission_checked as allowed", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "show recent runs" },
      makeMockLLMClient({ toolName: "list_runs" })
    );
    const permEvt = result.events.find((e) => e.type === "permission_checked");
    expect((permEvt?.data as Record<string, unknown>)?.["decision"]).toBe("allowed");
  });

  it("response_created is the last event", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "show recent runs" },
      makeMockLLMClient({ toolName: "list_runs" })
    );
    expect(result.events.at(-1)?.type).toBe("response_created");
  });
});

// ─── check_run_status ─────────────────────────────────────────────────────────

describe("runRuntimeTurnWithClient — check_run_status", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "creatormesh-run-test-"));
    process.env["CREATORMESH_EVENTS_DIR"] = tmpDir;
  });

  afterEach(async () => {
    delete process.env["CREATORMESH_EVENTS_DIR"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns completed status and selects the tool", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "check issue 3 for idea-factory" },
      makeMockLLMClient({
        toolName: "check_run_status",
        toolArgs: { projectId: "idea-factory", issueNumber: 3 },
      })
    );
    expect(result.status).toBe("completed");
    expect(result.selectedToolName).toBe("check_run_status");
  });
});

// ─── create_claude_task — needs approval ─────────────────────────────────────

describe("runRuntimeTurnWithClient — create_claude_task", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "creatormesh-run-test-"));
    process.env["CREATORMESH_EVENTS_DIR"] = tmpDir;
  });

  afterEach(async () => {
    delete process.env["CREATORMESH_EVENTS_DIR"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns needs_approval status", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "give idea-factory a task to add mock idea ranking" },
      makeMockLLMClient({
        toolName: "create_claude_task",
        toolArgs: { projectId: "idea-factory", title: "Add ranking", body: "Implement ranking" },
      })
    );
    expect(result.status).toBe("needs_approval");
  });

  it("does not execute the tool — no tool_started event", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "give idea-factory a task to add mock idea ranking" },
      makeMockLLMClient({
        toolName: "create_claude_task",
        toolArgs: { projectId: "idea-factory", title: "Add ranking", body: "Implement ranking" },
      })
    );
    const types = result.events.map((e) => e.type);
    expect(types).not.toContain("tool_started");
    expect(types).not.toContain("tool_completed");
  });

  it("explains that approval is required in the response", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "give idea-factory a task to add mock idea ranking" },
      makeMockLLMClient({
        toolName: "create_claude_task",
        toolArgs: { projectId: "idea-factory", title: "Add ranking", body: "Implement ranking" },
      })
    );
    expect(result.finalResponse.toLowerCase()).toContain("approval");
  });

  it("records permission_checked with needs_approval", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "give idea-factory a task to add mock idea ranking" },
      makeMockLLMClient({
        toolName: "create_claude_task",
        toolArgs: { projectId: "idea-factory", title: "Add ranking", body: "Implement ranking" },
      })
    );
    const permEvt = result.events.find((e) => e.type === "permission_checked");
    expect((permEvt?.data as Record<string, unknown>)?.["decision"]).toBe("needs_approval");
  });
});

// ─── LLM clarification ────────────────────────────────────────────────────────

describe("runRuntimeTurnWithClient — LLM requests clarification", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "creatormesh-run-test-"));
    process.env["CREATORMESH_EVENTS_DIR"] = tmpDir;
  });

  afterEach(async () => {
    delete process.env["CREATORMESH_EVENTS_DIR"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns completed with clarification question as the response", async () => {
    const result = await runRuntimeTurnWithClient(
      { userInput: "check it" },
      makeMockLLMClient({
        toolName: "none",
        needsClarification: true,
        clarificationQuestion: "Which project and issue number would you like to check?",
        confidence: 0.4,
      })
    );
    expect(result.status).toBe("completed");
    expect(result.finalResponse).toContain("Which project");
  });
});
