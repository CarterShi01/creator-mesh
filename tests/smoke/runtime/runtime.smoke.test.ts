import { describe, it, expect, vi } from "vitest";
import { Runtime } from "../../../src/runtime/runtime.js";
import { GovernanceEvaluator } from "../../../src/governance/index.js";
import type { AgentRole, AgentInput } from "../../../src/agents/port.js";
import type { ConnectorPort, ConnectorAction, ConnectorResult } from "../../../src/capabilities/connectors/port.js";
import type { RunnerPort, RunnerAction, RunnerResult } from "../../../src/capabilities/runners/port.js";
import type { AgentStep, ConnectorStep, RunnerStep } from "../../../src/workflows/types.js";
import type { Capability } from "../../../src/capabilities/connectors/port.js";
import type { RunnerCapability } from "../../../src/capabilities/runners/port.js";

function makeAgentStep(overrides: Partial<AgentStep> = {}): AgentStep {
  return {
    stepId: "classify",
    name: "Classify",
    type: "agent",
    agentRole: "thought-agent",
    description: "Classify the thought",
    inputMapping: { thought: "$input.thought" },
    outputKey: "classify",
    onSuccess: "complete",
    onFailure: "fail",
    ...overrides,
  };
}

function makeConnectorStep(overrides: Partial<ConnectorStep> = {}): ConnectorStep {
  return {
    stepId: "write-notion",
    name: "Write Notion",
    type: "connector",
    connectorId: "notion",
    capabilityType: "create",
    resourceType: "page",
    description: "Create a Notion page",
    inputMapping: { title: "$steps.classify.title" },
    outputKey: "write-notion",
    requiresApproval: true,
    onSuccess: "complete",
    onFailure: "fail",
    ...overrides,
  };
}

function makeRunnerStep(overrides: Partial<RunnerStep> = {}): RunnerStep {
  return {
    stepId: "run-test",
    name: "Run Tests",
    type: "runner",
    runnerId: "claude-code",
    taskType: "test",
    description: "Run the test suite",
    inputMapping: {},
    outputKey: "run-test",
    onSuccess: "complete",
    onFailure: "fail",
    ...overrides,
  };
}

function makeMockAgent(result: unknown = { category: "idea" }): AgentRole {
  return {
    agentId: "thought-agent",
    execute: vi.fn().mockResolvedValue({ agentRole: "thought-agent", result }),
  };
}

function makeMockConnector(data: unknown = { pageId: "abc123" }): ConnectorPort {
  const capability = {
    id: "notion.create",
    type: "create" as const,
    resourceType: "page",
    permissionLevel: "write" as const,
    approvalRequirement: "always" as const,
    reversible: false,
    description: "Create a page",
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
      data,
      completedAt: new Date(),
      auditId: "audit-1",
    } satisfies ConnectorResult),
  };
}

function makeMockRunner(output: unknown = "test passed"): RunnerPort {
  return {
    runnerId: "claude-code",
    registry: () => ({
      runnerId: "claude-code",
      capabilities: [],
      supports: () => true,
      get: () => undefined,
    }),
    execute: vi.fn().mockResolvedValue({
      runnerId: "claude-code",
      action: {} as RunnerAction,
      runId: "run-1",
      status: "success",
      output,
      auditId: "audit-2",
    } satisfies RunnerResult),
  };
}

describe("Runtime.executeStep — agent steps", () => {
  it("dispatches to the registered AgentRole and returns result", async () => {
    const agent = makeMockAgent({ category: "idea", summary: "Test idea" });
    const runtime = new Runtime(
      new Map([["thought-agent", agent]]),
      new Map(),
      new Map()
    );
    const step = makeAgentStep();
    const output = await runtime.executeStep(step, { thought: "A distributed systems idea" }, {});
    expect(output).toEqual({ category: "idea", summary: "Test idea" });
    expect(agent.execute).toHaveBeenCalledWith(
      expect.objectContaining({ agentRole: "thought-agent", context: { thought: "A distributed systems idea" } })
    );
  });

  it("throws when agent role is not registered", async () => {
    const runtime = new Runtime(new Map(), new Map(), new Map());
    await expect(
      runtime.executeStep(makeAgentStep(), {}, {})
    ).rejects.toThrow('agent role not registered: "thought-agent"');
  });
});

describe("Runtime.executeStep — connector steps", () => {
  it("dispatches to the registered ConnectorPort and returns data", async () => {
    const connector = makeMockConnector({ pageId: "xyz789" });
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map());
    const step = makeConnectorStep();
    const output = await runtime.executeStep(
      step,
      {},
      { classify: { title: "My Idea Page" } }
    );
    expect(output).toEqual({ pageId: "xyz789" });
    expect(connector.execute).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: "notion", resourceType: "page" })
    );
  });

  it("throws when connector is not registered", async () => {
    const runtime = new Runtime(new Map(), new Map(), new Map());
    await expect(
      runtime.executeStep(makeConnectorStep(), {}, {})
    ).rejects.toThrow('connector not registered: "notion"');
  });

  it("throws when connector returns failure", async () => {
    const connector = makeMockConnector();
    (connector.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectorId: "notion",
      action: {} as ConnectorAction,
      status: "failure",
      error: "API rate limit",
      completedAt: new Date(),
      auditId: "audit-err",
    });
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map());
    await expect(
      runtime.executeStep(makeConnectorStep(), {}, { classify: { title: "Test" } })
    ).rejects.toThrow("API rate limit");
  });
});

describe("Runtime.executeStep — runner steps", () => {
  it("dispatches to the registered RunnerPort and returns output", async () => {
    const runner = makeMockRunner("all tests passed");
    const runtime = new Runtime(new Map(), new Map(), new Map([["claude-code", runner]]));
    const output = await runtime.executeStep(makeRunnerStep(), {}, {});
    expect(output).toBe("all tests passed");
  });

  it("throws when runner is not registered", async () => {
    const runtime = new Runtime(new Map(), new Map(), new Map());
    await expect(
      runtime.executeStep(makeRunnerStep(), {}, {})
    ).rejects.toThrow('runner not registered: "claude-code"');
  });
});

describe("Runtime — input mapping resolution", () => {
  it("resolves $input.* references from workflowInput", async () => {
    const agent = makeMockAgent({});
    const runtime = new Runtime(
      new Map([["thought-agent", agent]]),
      new Map(),
      new Map()
    );
    await runtime.executeStep(
      makeAgentStep({ inputMapping: { thought: "$input.rawThought" } }),
      { rawThought: "hello world" },
      {}
    );
    expect(agent.execute).toHaveBeenCalledWith(
      expect.objectContaining({ context: { thought: "hello world" } })
    );
  });

  it("resolves $steps.*.* references from stepOutputs", async () => {
    const agent = makeMockAgent({});
    const runtime = new Runtime(
      new Map([["thought-agent", agent]]),
      new Map(),
      new Map()
    );
    await runtime.executeStep(
      makeAgentStep({ inputMapping: { title: "$steps.classify.title" } }),
      {},
      { classify: { title: "Deep Work" } }
    );
    expect(agent.execute).toHaveBeenCalledWith(
      expect.objectContaining({ context: { title: "Deep Work" } })
    );
  });
});

describe("Runtime — unsupported step type", () => {
  it("throws for knowledge step type", async () => {
    const runtime = new Runtime(new Map(), new Map(), new Map());
    const step = { type: "knowledge", stepId: "k1", name: "k", description: "d", onSuccess: "complete", onFailure: "fail" } as unknown as AgentStep;
    await expect(runtime.executeStep(step, {}, {})).rejects.toThrow('unsupported step type "knowledge"');
  });
});

// ──────────────────────────────────────────────
// Governance integration tests
// ──────────────────────────────────────────────

function makeCapability(
  permissionLevel: Capability["permissionLevel"],
  type: Capability["type"] = "create"
): Capability {
  return {
    id: `notion.${type}.page`,
    type,
    resourceType: "page",
    permissionLevel,
    approvalRequirement: permissionLevel === "safe-read" ? "never" : "always",
    reversible: permissionLevel === "safe-read",
    description: `${type} page`,
  };
}

function makeConnectorWithPermission(permissionLevel: Capability["permissionLevel"]): ConnectorPort {
  const cap = makeCapability(permissionLevel);
  return {
    connectorId: "notion",
    capabilities: () => ({
      connectorId: "notion",
      capabilities: [cap],
      supports: () => true,
      get: () => cap,
    }),
    execute: vi.fn().mockResolvedValue({
      connectorId: "notion",
      action: {} as ConnectorAction,
      status: "success",
      data: { id: "page-1" },
      completedAt: new Date(),
      auditId: "audit-gov",
    } satisfies ConnectorResult),
  };
}

function makeRunnerWithPermission(
  permissionLevel: RunnerCapability["permissionLevel"],
  taskType: RunnerCapability["taskType"] = "write"
): RunnerPort {
  const cap: RunnerCapability = {
    id: `claude-code.${taskType}`,
    taskType,
    permissionLevel,
    approvalRequirement: "always",
    async: false,
    description: `${taskType} task`,
  };
  return {
    runnerId: "claude-code",
    registry: () => ({
      runnerId: "claude-code",
      capabilities: [cap],
      supports: () => true,
      get: () => cap,
    }),
    execute: vi.fn().mockResolvedValue({
      runnerId: "claude-code",
      action: {} as RunnerAction,
      runId: "run-gov",
      status: "success",
      output: "done",
      auditId: "audit-gov-runner",
    } satisfies RunnerResult),
  };
}

const governance = new GovernanceEvaluator();

describe("Runtime — governance: connector steps", () => {
  it("auto-approves safe-read connector step (no prior human review needed)", async () => {
    const connector = makeConnectorWithPermission("safe-read");
    const step = makeConnectorStep({ capabilityType: "read" });
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map(), governance);
    const output = await runtime.executeStep(step, {}, {});
    expect(output).toEqual({ id: "page-1" });
    expect(connector.execute).toHaveBeenCalled();
  });

  it("blocks write connector step when no prior human review", async () => {
    const connector = makeConnectorWithPermission("write");
    const step = makeConnectorStep();
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map(), governance);
    await expect(
      runtime.executeStep(step, {}, {})
    ).rejects.toThrow(/Governance blocked connector step.*require explicit human approval/);
    expect(connector.execute).not.toHaveBeenCalled();
  });

  it("denies destructive connector step even with prior human review", async () => {
    const connector = makeConnectorWithPermission("destructive");
    const step = makeConnectorStep({ capabilityType: "delete" });
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map(), governance);
    await expect(
      runtime.executeStep(step, {}, { "review-step": { decision: "accept" } })
    ).rejects.toThrow(/Governance denied connector step.*destructive.*denied by default/);
    expect(connector.execute).not.toHaveBeenCalled();
  });

  it("auto-approves write connector step when prior human-review accepted", async () => {
    const connector = makeConnectorWithPermission("write");
    const step = makeConnectorStep();
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map(), governance);
    const output = await runtime.executeStep(step, {}, {
      "review-classification": { decision: "accept" },
    });
    expect(output).toEqual({ id: "page-1" });
    expect(connector.execute).toHaveBeenCalled();
  });

  it("blocks write connector step when prior human-review rejected", async () => {
    const connector = makeConnectorWithPermission("write");
    const step = makeConnectorStep();
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map(), governance);
    await expect(
      runtime.executeStep(step, {}, { "review-step": { decision: "reject" } })
    ).rejects.toThrow(/Governance blocked/);
    expect(connector.execute).not.toHaveBeenCalled();
  });
});

describe("Runtime — governance: runner steps", () => {
  it("auto-approves safe-read runner step", async () => {
    const runner = makeRunnerWithPermission("safe-read", "read");
    const step = makeRunnerStep({ taskType: "read" });
    const runtime = new Runtime(new Map(), new Map(), new Map([["claude-code", runner]]), governance);
    const output = await runtime.executeStep(step, {}, {});
    expect(output).toBe("done");
    expect(runner.execute).toHaveBeenCalled();
  });

  it("blocks write runner step without prior human review", async () => {
    const runner = makeRunnerWithPermission("write", "write");
    const step = makeRunnerStep({ taskType: "write" });
    const runtime = new Runtime(new Map(), new Map(), new Map([["claude-code", runner]]), governance);
    await expect(
      runtime.executeStep(step, {}, {})
    ).rejects.toThrow(/Governance blocked runner step.*require explicit human approval/);
    expect(runner.execute).not.toHaveBeenCalled();
  });

  it("auto-approves write runner step after human-review accepted", async () => {
    const runner = makeRunnerWithPermission("write", "write");
    const step = makeRunnerStep({ taskType: "write" });
    const runtime = new Runtime(new Map(), new Map(), new Map([["claude-code", runner]]), governance);
    const output = await runtime.executeStep(step, {}, {
      "human-review": { decision: "accept" },
    });
    expect(output).toBe("done");
  });
});

describe("Runtime — governance: backward compat (no GovernanceEvaluator)", () => {
  it("existing write connector step still passes when governance is not provided", async () => {
    const connector = makeMockConnector({ pageId: "xyz789" });
    const runtime = new Runtime(new Map(), new Map([["notion", connector]]), new Map());
    const output = await runtime.executeStep(makeConnectorStep(), {}, { classify: { title: "My Idea Page" } });
    expect(output).toEqual({ pageId: "xyz789" });
  });
});
