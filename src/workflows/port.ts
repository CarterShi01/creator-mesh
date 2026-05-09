import type {
  WorkflowStep,
  WorkflowRunStatus,
  WorkflowStepStatus,
  WorkflowStepType,
  GovernanceApprovalRequirement,
  WorkflowResultStatus,
  WorkflowResumeDecision,
  WorkflowInputSchema,
  WorkflowInput,
  WorkflowOutput,
} from "./types.js";

export interface GovernanceCheckpoint {
  stepId?: string;
  stepType?: WorkflowStepType;
  approvalRequirement: GovernanceApprovalRequirement;
  reason: string;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  version: string;
  description: string;
  inputSchema: WorkflowInputSchema;
  steps: WorkflowStep[];
  governanceCheckpoints: GovernanceCheckpoint[];
  tags?: string[];
}

export interface WorkflowContext {
  runId: string;
  workflowId: string;
  input: WorkflowInput;
  stepOutputs: Record<string, unknown>;
  currentStepId: string;
  createdAt: Date;
}

export interface WorkflowStepRecord {
  stepId: string;
  type: WorkflowStepType;
  status: WorkflowStepStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  auditId?: string;
}

export interface WorkflowRun {
  runId: string;
  workflowId: string;
  workflowVersion: string;
  status: WorkflowRunStatus;
  input: WorkflowInput;
  context: WorkflowContext;
  stepHistory: WorkflowStepRecord[];
  startedAt: Date;
  pausedAt?: Date;
  completedAt?: Date;
  result?: WorkflowResult;
}

export interface WorkflowPauseState {
  stepId: string;
  prompt: string;
  acceptLabel: string;
  rejectLabel: string;
}

export interface WorkflowResult {
  runId: string;
  status: WorkflowResultStatus;
  output?: WorkflowOutput;
  error?: string;
  pausedAt?: WorkflowPauseState;
  completedAt?: Date;
}

export interface WorkflowResumeInput {
  decision: WorkflowResumeDecision;
  annotations?: string;
  revisedInput?: unknown;
}

export interface WorkflowRunStatus_ {
  runId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  currentStepId?: string;
  stepHistory: WorkflowStepRecord[];
}

export interface WorkflowRunnerPort {
  runnerId: string;
  execute(
    definition: WorkflowDefinition,
    input: WorkflowInput
  ): Promise<WorkflowResult>;
  resume(runId: string, input: WorkflowResumeInput): Promise<WorkflowResult>;
  status(runId: string): Promise<WorkflowRunStatus_>;
  cancel(runId: string): Promise<void>;
}
