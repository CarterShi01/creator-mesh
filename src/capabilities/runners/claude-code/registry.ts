import type { RunnerCapability, RunnerRegistry } from "../port.js";
import type { RunnerTaskType } from "../types.js";

const MVP_CAPABILITIES: RunnerCapability[] = [
  {
    id: "claude-code.read",
    taskType: "read",
    permissionLevel: "safe-read",
    approvalRequirement: "never",
    async: false,
    description: "Read files and inspect codebase without side effects",
  },
  {
    id: "claude-code.plan",
    taskType: "plan",
    permissionLevel: "safe-read",
    approvalRequirement: "never",
    async: false,
    description: "Generate plans, architectures, or implementation guides without side effects",
  },
  {
    id: "claude-code.write",
    taskType: "write",
    permissionLevel: "write",
    approvalRequirement: "conditional",
    async: true,
    description: "Create or modify local files using Claude Code",
  },
  {
    id: "claude-code.test",
    taskType: "test",
    permissionLevel: "write",
    approvalRequirement: "conditional",
    async: false,
    description: "Run test suites or verification commands and return output",
  },
];

export class ClaudeCodeRunnerRegistry implements RunnerRegistry {
  readonly runnerId = "claude-code";
  readonly capabilities: RunnerCapability[] = MVP_CAPABILITIES;

  supports(taskType: RunnerTaskType): boolean {
    return this.capabilities.some((c) => c.taskType === taskType);
  }

  get(taskType: RunnerTaskType): RunnerCapability | undefined {
    return this.capabilities.find((c) => c.taskType === taskType);
  }
}
