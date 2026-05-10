import type {
  RunnerTaskType,
  RunnerPermissionLevel,
  ApprovalRequirement,
  RunnerResultStatus,
  RunnerActionStatus,
  ApprovalResult,
} from "./types.js";

export interface RunnerCapability {
  id: string;
  taskType: RunnerTaskType;
  permissionLevel: RunnerPermissionLevel;
  approvalRequirement: ApprovalRequirement;
  async: boolean;
  description: string;
}

export interface RunnerRegistry {
  runnerId: string;
  capabilities: RunnerCapability[];
  supports(taskType: RunnerTaskType): boolean;
  get(taskType: RunnerTaskType): RunnerCapability | undefined;
}

export interface RunnerContext {
  workingDirectory?: string;
  files?: string[];
  constraints?: string[];
  parameters?: Record<string, unknown>;
}

export interface RunnerAction {
  runnerId: string;
  taskType: RunnerTaskType;
  taskDescription: string;
  context?: RunnerContext;
  requestedAt: Date;
  approvalResult?: ApprovalResult;
  status: RunnerActionStatus;
  runId?: string;
}

export interface RunnerArtifact {
  path: string;
  operation: "created" | "modified" | "deleted";
}

export interface RunnerResult {
  runnerId: string;
  action: RunnerAction;
  runId: string;
  status: RunnerResultStatus;
  output?: unknown;
  stdout?: string;
  artifacts?: RunnerArtifact[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  auditId: string;
}

export interface RunnerConfig {
  runnerId: string;
  [key: string]: unknown;
}

export interface RunnerPort {
  runnerId: string;
  registry(): RunnerRegistry;
  execute(action: RunnerAction): Promise<RunnerResult>;
}
