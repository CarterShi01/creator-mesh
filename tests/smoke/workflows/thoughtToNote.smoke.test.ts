import { describe, it, expect } from "vitest";
import { thoughtToNoteWorkflow } from "../../../src/workflows/definitions/thought-to-note.js";
import { LocalWorkflowRunner } from "../../../src/workflows/local-runner.js";

describe("thoughtToNoteWorkflow definition", () => {
  it("has correct workflowId and version", () => {
    expect(thoughtToNoteWorkflow.workflowId).toBe("thought-to-note");
    expect(thoughtToNoteWorkflow.version).toBe("0.1.0");
  });

  it("defines exactly 3 steps in correct order", () => {
    const ids = thoughtToNoteWorkflow.steps.map((s) => s.stepId);
    expect(ids).toEqual(["classify", "review-classification", "write-notion"]);
  });

  it("step types are agent → human-review → connector", () => {
    const types = thoughtToNoteWorkflow.steps.map((s) => s.type);
    expect(types).toEqual(["agent", "human-review", "connector"]);
  });

  it("classify step routes to review-classification on success", () => {
    const classify = thoughtToNoteWorkflow.steps[0];
    expect(classify.onSuccess).toBe("review-classification");
    expect(classify.onFailure).toBe("fail");
  });

  it("review-classification step routes to write-notion on accept, fail on reject", () => {
    const review = thoughtToNoteWorkflow.steps[1];
    expect(review.type).toBe("human-review");
    if (review.type === "human-review") {
      expect(review.onAccept).toBe("write-notion");
      expect(review.onReject).toBe("fail");
    }
  });

  it("write-notion step uses notion connector with create capability", () => {
    const write = thoughtToNoteWorkflow.steps[2];
    expect(write.type).toBe("connector");
    if (write.type === "connector") {
      expect(write.connectorId).toBe("notion");
      expect(write.capabilityType).toBe("create");
      expect(write.resourceType).toBe("page");
      expect(write.requiresApproval).toBe(true);
    }
  });

  it("has exactly one governance checkpoint on write-notion with always approval", () => {
    expect(thoughtToNoteWorkflow.governanceCheckpoints).toHaveLength(1);
    const checkpoint = thoughtToNoteWorkflow.governanceCheckpoints[0];
    expect(checkpoint.stepId).toBe("write-notion");
    expect(checkpoint.approvalRequirement).toBe("always");
    expect(checkpoint.reason).toBeTruthy();
  });

  it("inputSchema declares thought and notionParentId", () => {
    expect(thoughtToNoteWorkflow.inputSchema).toHaveProperty("thought");
    expect(thoughtToNoteWorkflow.inputSchema).toHaveProperty("notionParentId");
  });

  it("write-notion input mapping references classify step output", () => {
    const write = thoughtToNoteWorkflow.steps[2];
    if (write.type === "connector") {
      expect(write.inputMapping["title"]).toContain("$steps.classify");
      expect(write.inputMapping["parent"]).toContain("$input.notionParentId");
    }
  });
});

describe("thoughtToNoteWorkflow with LocalWorkflowRunner", () => {
  it("pauses at review-classification step", async () => {
    const runner = new LocalWorkflowRunner();
    const result = await runner.execute(thoughtToNoteWorkflow, {
      thought: "Distributed systems need better observability primitives",
      notionParentId: "parent-page-id-123",
    });

    expect(result.status).toBe("paused");
    expect(result.pausedAt?.stepId).toBe("review-classification");
    expect(result.pausedAt?.prompt).toContain("classified");
    expect(result.pausedAt?.acceptLabel).toContain("Notion");
  });

  it("completes end-to-end with accept decision", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "Event sourcing enables temporal queries",
      notionParentId: "parent-page-id-456",
    });

    expect(paused.status).toBe("paused");

    const result = await runner.resume(paused.runId, {
      decision: "accept",
      annotations: "Classification is accurate",
    });

    expect(result.status).toBe("completed");
    expect(result.output).toBeDefined();
    const output = result.output as Record<string, unknown>;
    expect(output).toHaveProperty("classify");
    expect(output).toHaveProperty("review-classification");
    expect(output).toHaveProperty("write-notion");
  });

  it("fails gracefully when creator rejects at review step", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "A messy thought I am not sure about",
      notionParentId: "parent-page-id-789",
    });

    const result = await runner.resume(paused.runId, { decision: "reject" });
    expect(result.status).toBe("failed");
    expect(result.error).toContain("rejected");
  });

  it("step history records all executed steps after accept", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(thoughtToNoteWorkflow, {
      thought: "CQRS separates read and write models",
      notionParentId: "parent-page-id-000",
    });
    await runner.resume(paused.runId, { decision: "accept" });

    const s = await runner.status(paused.runId);
    const recordedIds = s.stepHistory.map((r) => r.stepId);
    expect(recordedIds).toContain("classify");
    expect(recordedIds).toContain("review-classification");
    expect(recordedIds).toContain("write-notion");
    s.stepHistory.forEach((r) => expect(r.status).toBe("completed"));
  });
});
