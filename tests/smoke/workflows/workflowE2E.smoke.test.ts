import { describe, it, expect, vi } from "vitest";
import { LocalWorkflowRunner } from "../../../src/workflows/local-runner.js";
import { Runtime } from "../../../src/runtime/runtime.js";
import { ThoughtAgent } from "../../../src/agents/thought-agent.js";
import { thoughtToNoteWorkflow } from "../../../src/workflows/definitions/thought-to-note.js";
import type { ThoughtAgentClient, ThoughtClassification } from "../../../src/agents/thought-agent.js";
import type { ConnectorPort, ConnectorAction, ConnectorResult } from "../../../src/connectors/port.js";

const MOCK_CLASSIFICATION: ThoughtClassification = {
  category: "idea",
  summary: "Event sourcing enables temporal queries over data.",
  tags: ["event-sourcing", "cqrs", "architecture"],
  confidence: 0.95,
  suggestedTitle: "Event Sourcing Enables Temporal Queries",
};

function makeMockThoughtClient(): ThoughtAgentClient {
  return {
    complete: vi.fn().mockResolvedValue(JSON.stringify(MOCK_CLASSIFICATION)),
  };
}

function makeMockNotionConnector(pageId = "notion-page-abc"): ConnectorPort {
  const capability = {
    id: "notion.create",
    type: "create" as const,
    resourceType: "page",
    permissionLevel: "write" as const,
    approvalRequirement: "always" as const,
    reversible: false,
    description: "Create a Notion page",
  };
  return {
    connectorId: "notion",
    capabilities: () => ({
      connectorId: "notion",
      capabilities: [capability],
      supports: () => true,
      get: () => capability,
    }),
    execute: vi.fn().mockResolvedValue({
      connectorId: "notion",
      action: {} as ConnectorAction,
      status: "success",
      data: { id: pageId, url: `https://notion.so/${pageId}` },
      completedAt: new Date(),
      auditId: "audit-e2e-1",
    } satisfies ConnectorResult),
  };
}

describe("ThoughtToNoteWorkflow — end-to-end with real dispatch", () => {
  function buildRunner() {
    const thoughtClient = makeMockThoughtClient();
    const notionConnector = makeMockNotionConnector();
    const thoughtAgent = new ThoughtAgent(thoughtClient);

    const runtime = new Runtime(
      new Map([["thought-agent", thoughtAgent]]),
      new Map([["notion", notionConnector]]),
      new Map()
    );

    const runner = new LocalWorkflowRunner(runtime);
    return { runner, thoughtClient, notionConnector };
  }

  it("pauses at review-classification step", async () => {
    const { runner } = buildRunner();
    const result = await runner.execute(thoughtToNoteWorkflow, {
      thought: "Event sourcing enables temporal queries",
      notionParentId: "parent-page-id-123",
    });
    expect(result.status).toBe("paused");
    expect(result.pausedAt?.stepId).toBe("review-classification");
  });

  it("classify step calls ThoughtAgent with thought from input", async () => {
    const { runner, thoughtClient } = buildRunner();
    await runner.execute(thoughtToNoteWorkflow, {
      thought: "Event sourcing enables temporal queries",
      notionParentId: "parent-page-id-123",
    });
    expect(thoughtClient.complete).toHaveBeenCalledOnce();
    const [, userPrompt] = (thoughtClient.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(userPrompt).toBe("Event sourcing enables temporal queries");
  });

  it("classify step output contains ThoughtClassification fields", async () => {
    const { runner } = buildRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "Event sourcing enables temporal queries",
      notionParentId: "parent-page-id-123",
    });

    const s = await runner.status(paused.runId);
    const classifyRecord = s.stepHistory.find((r) => r.stepId === "classify");
    expect(classifyRecord).toBeDefined();
    const output = classifyRecord!.output as ThoughtClassification;
    expect(output.category).toBe("idea");
    expect(output.suggestedTitle).toBe("Event Sourcing Enables Temporal Queries");
  });

  it("completes end-to-end after accept: writes Notion page", async () => {
    const { runner, notionConnector } = buildRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "Event sourcing enables temporal queries",
      notionParentId: "parent-page-id-456",
    });

    expect(paused.status).toBe("paused");

    const result = await runner.resume(paused.runId, {
      decision: "accept",
      annotations: "Classification looks correct",
    });

    expect(result.status).toBe("completed");
    expect(notionConnector.execute).toHaveBeenCalledOnce();

    const output = result.output as Record<string, unknown>;
    expect(output).toHaveProperty("classify");
    expect(output).toHaveProperty("review-classification");
    expect(output).toHaveProperty("write-notion");
  });

  it("write-notion step receives title from classify output", async () => {
    const { runner, notionConnector } = buildRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "Event sourcing enables temporal queries",
      notionParentId: "parent-page-id-789",
    });
    await runner.resume(paused.runId, { decision: "accept" });

    const call = (notionConnector.execute as ReturnType<typeof vi.fn>).mock.calls[0][0] as ConnectorAction;
    expect(call.payload?.title).toBe("Event Sourcing Enables Temporal Queries");
    expect(call.payload?.parent).toBe("parent-page-id-789");
  });

  it("notion connector is NOT called when creator rejects at review", async () => {
    const { runner, notionConnector } = buildRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "A messy thought I'm not sure about",
      notionParentId: "parent-page-id-000",
    });
    const result = await runner.resume(paused.runId, { decision: "reject" });

    expect(result.status).toBe("failed");
    expect(notionConnector.execute).not.toHaveBeenCalled();
  });

  it("step history records classify, review-classification, write-notion after accept", async () => {
    const { runner } = buildRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "CQRS separates read and write models",
      notionParentId: "parent-page-id-cqrs",
    });
    await runner.resume(paused.runId, { decision: "accept" });

    const s = await runner.status(paused.runId);
    const ids = s.stepHistory.map((r) => r.stepId);
    expect(ids).toContain("classify");
    expect(ids).toContain("review-classification");
    expect(ids).toContain("write-notion");
    s.stepHistory.forEach((r) => expect(r.status).toBe("completed"));
  });

  it("fails gracefully when connector returns failure", async () => {
    const { runner, notionConnector } = buildRunner();
    (notionConnector.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectorId: "notion",
      action: {} as ConnectorAction,
      status: "failure",
      error: "Notion API 500",
      completedAt: new Date(),
      auditId: "audit-err",
    } satisfies ConnectorResult);

    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "A thought that will fail",
      notionParentId: "parent-page-fail",
    });
    const result = await runner.resume(paused.runId, { decision: "accept" });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Notion API 500");
  });
});

describe("LocalWorkflowRunner — stub mode still works without StepExecutor", () => {
  it("executes workflow with stubs when no StepExecutor is provided", async () => {
    const runner = new LocalWorkflowRunner(); // no executor
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "stub mode thought",
      notionParentId: "parent-stub",
    });
    expect(paused.status).toBe("paused");

    const result = await runner.resume(paused.runId, { decision: "accept" });
    expect(result.status).toBe("completed");

    const output = result.output as Record<string, unknown>;
    expect((output["classify"] as Record<string, unknown>).stubbed).toBe(true);
    expect((output["write-notion"] as Record<string, unknown>).stubbed).toBe(true);
  });
});
