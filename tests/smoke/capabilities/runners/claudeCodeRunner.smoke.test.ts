import { describe, it, expect, vi } from "vitest";
import { ClaudeCodeRunnerAdapter } from "../../../../src/capabilities/runners/claude-code/adapter.js";
import { ClaudeCodeRunnerRegistry } from "../../../../src/capabilities/runners/claude-code/registry.js";
import { classifyInvokeError } from "../../../../src/capabilities/runners/claude-code/errors.js";
import type { SubprocessInvoker } from "../../../../src/capabilities/runners/claude-code/invoke.js";
import type { RunnerAction } from "../../../../src/capabilities/runners/port.js";

function makeAction(taskType: string, description = "test task"): RunnerAction {
  return {
    runnerId: "claude-code",
    taskType: taskType as RunnerAction["taskType"],
    taskDescription: description,
    requestedAt: new Date(),
    status: "approved",
  };
}

function makeInvoker(stdout = "ok", exitCode = 0): SubprocessInvoker {
  return {
    invoke: vi.fn().mockResolvedValue({ stdout, stderr: "", exitCode }),
  };
}

describe("ClaudeCodeRunnerRegistry", () => {
  const registry = new ClaudeCodeRunnerRegistry();

  it("has runnerId claude-code", () => {
    expect(registry.runnerId).toBe("claude-code");
  });

  it("supports read, plan, write, test", () => {
    expect(registry.supports("read")).toBe(true);
    expect(registry.supports("plan")).toBe(true);
    expect(registry.supports("write")).toBe(true);
    expect(registry.supports("test")).toBe(true);
  });

  it("does not support script or external", () => {
    expect(registry.supports("script")).toBe(false);
    expect(registry.supports("external")).toBe(false);
  });

  it("get returns capability with correct permissionLevel", () => {
    expect(registry.get("read")?.permissionLevel).toBe("safe-read");
    expect(registry.get("write")?.permissionLevel).toBe("write");
  });

  it("get returns undefined for unsupported type", () => {
    expect(registry.get("human")).toBeUndefined();
  });
});

describe("ClaudeCodeRunnerAdapter", () => {
  it("runnerId is claude-code", () => {
    const adapter = new ClaudeCodeRunnerAdapter(makeInvoker());
    expect(adapter.runnerId).toBe("claude-code");
  });

  it("registry() returns ClaudeCodeRunnerRegistry", () => {
    const adapter = new ClaudeCodeRunnerAdapter(makeInvoker());
    expect(adapter.registry().runnerId).toBe("claude-code");
  });

  it("execute returns success when invoker exits 0", async () => {
    const adapter = new ClaudeCodeRunnerAdapter(makeInvoker("result output"));
    const result = await adapter.execute(makeAction("read", "read the file"));
    expect(result.status).toBe("success");
    expect(result.stdout).toBe("result output");
    expect(result.runnerId).toBe("claude-code");
  });

  it("execute returns failure when invoker exits non-zero", async () => {
    const invoker: SubprocessInvoker = {
      invoke: vi.fn().mockResolvedValue({ stdout: "", stderr: "permission denied", exitCode: 1 }),
    };
    const adapter = new ClaudeCodeRunnerAdapter(invoker);
    const result = await adapter.execute(makeAction("write", "write some code"));
    expect(result.status).toBe("failure");
    expect(result.error).toContain("permission denied");
  });

  it("execute returns failure with error code for unsupported task type", async () => {
    const adapter = new ClaudeCodeRunnerAdapter(makeInvoker());
    const result = await adapter.execute(makeAction("script", "run script"));
    expect(result.status).toBe("failure");
    expect(result.error).toContain("Unsupported task type");
  });

  it("execute returns failure with error code when invoker throws", async () => {
    const invoker: SubprocessInvoker = {
      invoke: vi.fn().mockRejectedValue(new Error("ENOENT: claude not found")),
    };
    const adapter = new ClaudeCodeRunnerAdapter(invoker);
    const result = await adapter.execute(makeAction("read", "read files"));
    expect(result.status).toBe("failure");
    expect(result.error).toBe("claude-code.cli.not_found");
  });

  it("result always has auditId and runId", async () => {
    const adapter = new ClaudeCodeRunnerAdapter(makeInvoker());
    const result = await adapter.execute(makeAction("plan", "plan the feature"));
    expect(result.auditId).toBeTruthy();
    expect(result.runId).toBeTruthy();
  });
});

describe("classifyInvokeError", () => {
  it("returns cli.not_found for ENOENT", () => {
    expect(classifyInvokeError(new Error("ENOENT: no such file"))).toBe("claude-code.cli.not_found");
  });

  it("returns timeout for timeout message", () => {
    expect(classifyInvokeError(new Error("Command timed out"))).toBe("claude-code.timeout");
  });

  it("returns exit_error as fallback", () => {
    expect(classifyInvokeError(new Error("something else"))).toBe("claude-code.exit_error");
    expect(classifyInvokeError("string error")).toBe("claude-code.exit_error");
  });
});
