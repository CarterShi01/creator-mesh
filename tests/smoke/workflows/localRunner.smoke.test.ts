import { describe, it, expect } from "vitest";
import { LocalWorkflowRunner } from "../../../src/workflows/local-runner.js";
import type {
  WorkflowDefinition,
  WorkflowResumeInput,
} from "../../../src/workflows/index.js";
import type { AgentStep, HumanReviewStep, ConnectorStep } from "../../../src/workflows/index.js";

const agentStep: AgentStep = {
  stepId: "classify",
  name: "Classify Thought",
  type: "agent",
  description: "Route to ThoughtAgent",
  agentRole: "thought-agent",
  inputMapping: { thought: "$input.thought" },
  outputKey: "structuredThought",
  onSuccess: "complete",
  onFailure: "fail",
};

const reviewStep: HumanReviewStep = {
  stepId: "review",
  name: "Review Classification",
  type: "human-review",
  description: "Creator reviews output",
  prompt: "Does the classification look correct?",
  acceptLabel: "Yes, continue",
  rejectLabel: "No, stop",
  onAccept: "complete",
  onReject: "fail",
  onSuccess: "complete",
  onFailure: "fail",
};

const notionStep: ConnectorStep = {
  stepId: "write-notion",
  name: "Write to Notion",
  type: "connector",
  description: "Create Notion page",
  connectorId: "notion",
  capabilityType: "create",
  resourceType: "page",
  inputMapping: { title: "$steps.classify.structuredThought" },
  outputKey: "notionPage",
  onSuccess: "complete",
  onFailure: "fail",
  requiresApproval: true,
};

const simpleDefinition: WorkflowDefinition = {
  workflowId: "simple-test",
  name: "Simple Test Workflow",
  version: "0.1.0",
  description: "Single agent step",
  inputSchema: { thought: "string" },
  steps: [agentStep],
  governanceCheckpoints: [],
};

const pauseDefinition: WorkflowDefinition = {
  workflowId: "pause-test",
  name: "Pause Test Workflow",
  version: "0.1.0",
  description: "Agent → HumanReview → Notion",
  inputSchema: { thought: "string" },
  steps: [
    { ...agentStep, onSuccess: "review" },
    reviewStep,
  ],
  governanceCheckpoints: [],
};

const fullDefinition: WorkflowDefinition = {
  workflowId: "full-test",
  name: "Full Test Workflow",
  version: "0.1.0",
  description: "Agent → HumanReview (accept) → Notion",
  inputSchema: { thought: "string" },
  steps: [
    { ...agentStep, stepId: "classify", onSuccess: "review" },
    {
      ...reviewStep,
      onAccept: "write-notion",
      onReject: "fail",
      onSuccess: "write-notion",
    },
    notionStep,
  ],
  governanceCheckpoints: [
    {
      stepId: "write-notion",
      approvalRequirement: "always",
      reason: "Writing to Notion requires explicit approval",
    },
  ],
};

describe("LocalWorkflowRunner", () => {
  it("completes a single-step workflow", async () => {
    const runner = new LocalWorkflowRunner();
    const result = await runner.execute(simpleDefinition, { thought: "An idea" });

    expect(result.status).toBe("completed");
    expect(result.runId).toBeTruthy();
    expect(result.output).toBeDefined();
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("pauses at a HumanReviewStep and returns pause state", async () => {
    const runner = new LocalWorkflowRunner();
    const result = await runner.execute(pauseDefinition, { thought: "An idea" });

    expect(result.status).toBe("paused");
    expect(result.pausedAt).toBeDefined();
    expect(result.pausedAt?.stepId).toBe("review");
    expect(result.pausedAt?.prompt).toContain("classification");
    expect(result.pausedAt?.acceptLabel).toBe("Yes, continue");
  });

  it("resumes with accept decision and completes", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(pauseDefinition, { thought: "An idea" });
    expect(paused.status).toBe("paused");

    const resumeInput: WorkflowResumeInput = {
      decision: "accept",
      annotations: "Looks good",
    };
    const result = await runner.resume(paused.runId, resumeInput);

    expect(result.status).toBe("completed");
    expect(result.output).toBeDefined();
  });

  it("resumes with reject decision and fails", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(pauseDefinition, { thought: "An idea" });

    const resumeInput: WorkflowResumeInput = { decision: "reject" };
    const result = await runner.resume(paused.runId, resumeInput);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("rejected");
  });

  it("returns error when resuming unknown runId", async () => {
    const runner = new LocalWorkflowRunner();
    const result = await runner.resume("nonexistent-run-id", { decision: "accept" });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("not_found");
  });

  it("returns error when resuming a non-paused run", async () => {
    const runner = new LocalWorkflowRunner();
    const completed = await runner.execute(simpleDefinition, { thought: "An idea" });
    expect(completed.status).toBe("completed");

    const result = await runner.resume(completed.runId, { decision: "accept" });
    expect(result.status).toBe("failed");
    expect(result.error).toContain("not_paused");
  });

  it("status() returns current run state", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(pauseDefinition, { thought: "An idea" });

    const s = await runner.status(paused.runId);
    expect(s.status).toBe("paused");
    expect(s.workflowId).toBe("pause-test");
    expect(s.currentStepId).toBe("review");
    expect(s.stepHistory.length).toBeGreaterThanOrEqual(1);
  });

  it("cancel() transitions run to cancelled", async () => {
    const runner = new LocalWorkflowRunner();
    const paused = await runner.execute(pauseDefinition, { thought: "An idea" });

    await runner.cancel(paused.runId);
    const s = await runner.status(paused.runId);
    expect(s.status).toBe("cancelled");
  });

  it("executes a multi-step workflow with accept through HumanReview to ConnectorStep", async () => {
    const runner = new LocalWorkflowRunner();

    // First execute — pauses at review step
    const paused = await runner.execute(fullDefinition, { thought: "Build a knowledge tree" });
    expect(paused.status).toBe("paused");
    expect(paused.pausedAt?.stepId).toBe("review");

    // Resume with accept — should continue to write-notion and complete
    const result = await runner.resume(paused.runId, { decision: "accept" });
    expect(result.status).toBe("completed");
    expect(result.output).toBeDefined();

    // Verify step history has all 3 steps recorded
    const s = await runner.status(paused.runId);
    const stepIds = s.stepHistory.map((r) => r.stepId);
    expect(stepIds).toContain("classify");
    expect(stepIds).toContain("review");
    expect(stepIds).toContain("write-notion");
  });

  it("step outputs are accumulated in context across steps", async () => {
    const runner = new LocalWorkflowRunner();
    const result = await runner.execute(simpleDefinition, { thought: "Test" });

    expect(result.status).toBe("completed");
    // Output object should contain step outputs keyed by stepId
    const output = result.output as Record<string, unknown>;
    expect(output).toHaveProperty("classify");
    const classifyOutput = output["classify"] as Record<string, unknown>;
    expect(classifyOutput.stubbed).toBe(true);
    expect(classifyOutput.agentRole).toBe("thought-agent");
  });
});
