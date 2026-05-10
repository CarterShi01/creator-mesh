import { describe, it, expect } from "vitest";
import type {
  RunnerPort,
  RunnerRegistry,
  RunnerCapability,
  RunnerAction,
  RunnerResult,
  RunnerContext,
  RunnerArtifact,
  RunnerConfig,
} from "../../../../src/capabilities/runners/index.js";
import type {
  RunnerTaskType,
  RunnerPermissionLevel,
  ApprovalRequirement,
  RunnerResultStatus,
  RunnerActionStatus,
  ApprovalResult,
} from "../../../../src/capabilities/runners/index.js";

describe("RunnerPort types", () => {
  it("RunnerCapability can be constructed with all required fields", () => {
    const cap: RunnerCapability = {
      id: "claude-code.read",
      taskType: "read",
      permissionLevel: "safe-read",
      approvalRequirement: "never",
      async: false,
      description: "Read files without side effects",
    };
    expect(cap.id).toBe("claude-code.read");
    expect(cap.taskType).toBe("read");
    expect(cap.permissionLevel).toBe("safe-read");
    expect(cap.approvalRequirement).toBe("never");
    expect(cap.async).toBe(false);
  });

  it("RunnerAction can be constructed with required fields", () => {
    const action: RunnerAction = {
      runnerId: "claude-code",
      taskType: "plan",
      taskDescription: "Generate an architecture plan for the connectors module",
      requestedAt: new Date(),
      status: "pending",
    };
    expect(action.runnerId).toBe("claude-code");
    expect(action.taskType).toBe("plan");
    expect(action.status).toBe("pending");
    expect(action.context).toBeUndefined();
    expect(action.runId).toBeUndefined();
  });

  it("RunnerAction accepts optional RunnerContext", () => {
    const ctx: RunnerContext = {
      workingDirectory: "/project",
      files: ["src/core/thought.ts"],
      constraints: ["Do not modify INTERFACE.md"],
      parameters: { maxTokens: 2000 },
    };
    const action: RunnerAction = {
      runnerId: "claude-code",
      taskType: "write",
      taskDescription: "Add JSDoc to Thought interface",
      context: ctx,
      requestedAt: new Date(),
      approvalResult: "approved",
      status: "approved",
    };
    expect(action.context?.workingDirectory).toBe("/project");
    expect(action.context?.files).toHaveLength(1);
    expect(action.approvalResult).toBe("approved");
  });

  it("RunnerResult can be constructed with all fields", () => {
    const action: RunnerAction = {
      runnerId: "claude-code",
      taskType: "read",
      taskDescription: "Read thought.ts",
      requestedAt: new Date(),
      status: "completed",
    };
    const artifact: RunnerArtifact = {
      path: "src/core/thought.ts",
      operation: "modified",
    };
    const result: RunnerResult = {
      runnerId: "claude-code",
      action,
      runId: crypto.randomUUID(),
      status: "success",
      stdout: "File read successfully",
      artifacts: [artifact],
      startedAt: new Date(),
      completedAt: new Date(),
      auditId: crypto.randomUUID(),
    };
    expect(result.status).toBe("success");
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts![0].operation).toBe("modified");
    expect(result.auditId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("all RunnerTaskType values are valid string literals", () => {
    const taskTypes: RunnerTaskType[] = [
      "read",
      "plan",
      "write",
      "test",
      "script",
      "external",
      "human",
    ];
    expect(taskTypes).toHaveLength(7);
    taskTypes.forEach((t) => expect(typeof t).toBe("string"));
  });

  it("all RunnerPermissionLevel values are valid string literals", () => {
    const levels: RunnerPermissionLevel[] = [
      "safe-read",
      "write",
      "execute",
      "external-side-effect",
      "human",
    ];
    expect(levels).toHaveLength(5);
  });

  it("RunnerConfig accepts arbitrary runner-specific fields", () => {
    const config: RunnerConfig = {
      runnerId: "claude-code",
      executablePath: "/usr/local/bin/claude",
      timeoutMs: 120000,
      maxOutputBytes: 1048576,
    };
    expect(config.runnerId).toBe("claude-code");
    expect(config["executablePath"]).toBe("/usr/local/bin/claude");
  });

  it("RunnerPort interface shape is structurally correct via mock", () => {
    const mockRegistry: RunnerRegistry = {
      runnerId: "mock",
      capabilities: [],
      supports: (taskType: RunnerTaskType) => taskType === "read",
      get: (taskType: RunnerTaskType) =>
        taskType === "read"
          ? {
              id: "mock.read",
              taskType: "read",
              permissionLevel: "safe-read",
              approvalRequirement: "never",
              async: false,
              description: "mock read",
            }
          : undefined,
    };

    const mockPort: RunnerPort = {
      runnerId: "mock",
      registry: () => mockRegistry,
      execute: async (action: RunnerAction): Promise<RunnerResult> => ({
        runnerId: "mock",
        action,
        runId: crypto.randomUUID(),
        status: "success",
        auditId: crypto.randomUUID(),
      }),
    };

    expect(mockPort.runnerId).toBe("mock");
    expect(mockPort.registry().supports("read")).toBe(true);
    expect(mockPort.registry().supports("write")).toBe(false);
    expect(mockPort.registry().get("read")?.id).toBe("mock.read");
    expect(mockPort.registry().get("write")).toBeUndefined();
  });
});
