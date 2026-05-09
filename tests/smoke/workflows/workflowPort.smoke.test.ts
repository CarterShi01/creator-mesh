import { describe, it, expect } from "vitest";
import type {
  WorkflowDefinition,
  WorkflowRunnerPort,
  WorkflowResult,
  WorkflowRun,
  WorkflowContext,
  WorkflowStepRecord,
  GovernanceCheckpoint,
  WorkflowResumeInput,
} from "../../../src/workflows/index.js";
import type {
  AgentStep,
  ConnectorStep,
  HumanReviewStep,
  RunnerStep,
  WorkflowInput,
  WorkflowRunStatus,
} from "../../../src/workflows/index.js";

describe("WorkflowPort types", () => {
  it("WorkflowDefinition can be constructed with all required fields", () => {
    const definition: WorkflowDefinition = {
      workflowId: "thought-to-note",
      name: "Thought to Structured Note",
      version: "0.1.0",
      description: "Normalize a raw Thought into a structured note",
      inputSchema: { thought: "Thought" },
      steps: [],
      governanceCheckpoints: [],
    };
    expect(definition.workflowId).toBe("thought-to-note");
    expect(definition.version).toBe("0.1.0");
    expect(definition.steps).toHaveLength(0);
  });

  it("AgentStep can be constructed", () => {
    const step: AgentStep = {
      stepId: "classify",
      name: "Classify Thought",
      type: "agent",
      description: "Route thought to ThoughtAgent for classification",
      agentRole: "thought-agent",
      inputMapping: { thought: "$input.thought" },
      outputKey: "structuredThought",
      onSuccess: "review",
      onFailure: "fail",
    };
    expect(step.type).toBe("agent");
    expect(step.agentRole).toBe("thought-agent");
    expect(step.inputMapping["thought"]).toBe("$input.thought");
  });

  it("ConnectorStep can be constructed", () => {
    const step: ConnectorStep = {
      stepId: "write-notion",
      name: "Write to Notion",
      type: "connector",
      description: "Create a new Notion page with the structured thought",
      connectorId: "notion",
      capabilityType: "create",
      resourceType: "page",
      inputMapping: {
        title: "$steps.classify.structuredThought",
        parent: "$input.notionParentId",
      },
      outputKey: "notionPage",
      onSuccess: "complete",
      onFailure: "fail",
      requiresApproval: true,
    };
    expect(step.type).toBe("connector");
    expect(step.connectorId).toBe("notion");
    expect(step.capabilityType).toBe("create");
    expect(step.requiresApproval).toBe(true);
  });

  it("HumanReviewStep can be constructed", () => {
    const step: HumanReviewStep = {
      stepId: "review",
      name: "Review Classification",
      type: "human-review",
      description: "Creator reviews the thought classification before writing",
      prompt: "Does this classification look correct?",
      acceptLabel: "Yes, write to Notion",
      rejectLabel: "No, revise",
      onAccept: "write-notion",
      onReject: "fail",
      onSuccess: "write-notion",
      onFailure: "fail",
    };
    expect(step.type).toBe("human-review");
    expect(step.onAccept).toBe("write-notion");
    expect(step.prompt).toContain("classification");
  });

  it("RunnerStep can be constructed", () => {
    const step: RunnerStep = {
      stepId: "generate-plan",
      name: "Generate Plan",
      type: "runner",
      description: "Use Claude Code to generate an implementation plan",
      runnerId: "claude-code",
      taskType: "plan",
      inputMapping: { context: "$steps.classify.structuredThought" },
      outputKey: "plan",
      onSuccess: "complete",
      onFailure: "fail",
    };
    expect(step.type).toBe("runner");
    expect(step.runnerId).toBe("claude-code");
    expect(step.taskType).toBe("plan");
  });

  it("GovernanceCheckpoint can be constructed", () => {
    const checkpoint: GovernanceCheckpoint = {
      stepId: "write-notion",
      approvalRequirement: "always",
      reason: "Writing to Notion requires explicit creator approval",
    };
    expect(checkpoint.approvalRequirement).toBe("always");
    expect(checkpoint.stepId).toBe("write-notion");
  });

  it("WorkflowRun can be constructed with full lifecycle state", () => {
    const input: WorkflowInput = { thought: "An idea about distributed systems" };
    const context: WorkflowContext = {
      runId: crypto.randomUUID(),
      workflowId: "thought-to-note",
      input,
      stepOutputs: {},
      currentStepId: "classify",
      createdAt: new Date(),
    };
    const stepRecord: WorkflowStepRecord = {
      stepId: "classify",
      type: "agent",
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      auditId: crypto.randomUUID(),
    };
    const run: WorkflowRun = {
      runId: context.runId,
      workflowId: "thought-to-note",
      workflowVersion: "0.1.0",
      status: "running",
      input,
      context,
      stepHistory: [stepRecord],
      startedAt: new Date(),
    };
    expect(run.status).toBe("running");
    expect(run.stepHistory).toHaveLength(1);
    expect(run.stepHistory[0].status).toBe("completed");
  });

  it("WorkflowResult carries pause state when paused", () => {
    const result: WorkflowResult = {
      runId: crypto.randomUUID(),
      status: "paused",
      pausedAt: {
        stepId: "review",
        prompt: "Does this classification look correct?",
        acceptLabel: "Yes, write to Notion",
        rejectLabel: "No, revise",
      },
    };
    expect(result.status).toBe("paused");
    expect(result.pausedAt?.stepId).toBe("review");
    expect(result.output).toBeUndefined();
  });

  it("WorkflowResumeInput accepts accept/reject decision", () => {
    const resumeAccept: WorkflowResumeInput = {
      decision: "accept",
      annotations: "Classification looks correct",
    };
    const resumeReject: WorkflowResumeInput = {
      decision: "reject",
    };
    expect(resumeAccept.decision).toBe("accept");
    expect(resumeReject.decision).toBe("reject");
    expect(resumeReject.annotations).toBeUndefined();
  });

  it("WorkflowRunnerPort interface shape is correct via mock", () => {
    const mockPort: WorkflowRunnerPort = {
      runnerId: "local",
      execute: async (_definition, _input) => ({
        runId: crypto.randomUUID(),
        status: "completed",
        completedAt: new Date(),
      }),
      resume: async (_runId, _input) => ({
        runId: _runId,
        status: "completed",
        completedAt: new Date(),
      }),
      status: async (runId) => ({
        runId,
        workflowId: "thought-to-note",
        status: "running" as WorkflowRunStatus,
        stepHistory: [],
      }),
      cancel: async (_runId) => {},
    };

    expect(mockPort.runnerId).toBe("local");
    expect(typeof mockPort.execute).toBe("function");
    expect(typeof mockPort.resume).toBe("function");
    expect(typeof mockPort.status).toBe("function");
    expect(typeof mockPort.cancel).toBe("function");
  });
});
