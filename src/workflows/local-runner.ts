import type {
  WorkflowRunnerPort,
  WorkflowDefinition,
  WorkflowResult,
  WorkflowRun,
  WorkflowContext,
  WorkflowStepRecord,
  WorkflowResumeInput,
} from "./port.js";
import type { WorkflowInput, WorkflowStep, HumanReviewStep } from "./types.js";

type RunStatus = {
  runId: string;
  workflowId: string;
  status: import("./types.js").WorkflowRunStatus;
  currentStepId?: string;
  stepHistory: WorkflowStepRecord[];
};

export class LocalWorkflowRunner implements WorkflowRunnerPort {
  readonly runnerId = "local";

  // In-memory stores — no external storage in phase 1
  private readonly runs = new Map<string, WorkflowRun>();
  private readonly definitions = new Map<string, WorkflowDefinition>();

  async execute(
    definition: WorkflowDefinition,
    input: WorkflowInput
  ): Promise<WorkflowResult> {
    // Cache definition so resume() can look it up
    this.definitions.set(definition.workflowId, definition);

    const runId = crypto.randomUUID();
    const firstStepId = definition.steps[0]?.stepId ?? "";
    const context: WorkflowContext = {
      runId,
      workflowId: definition.workflowId,
      input,
      stepOutputs: {},
      currentStepId: firstStepId,
      createdAt: new Date(),
    };

    const run: WorkflowRun = {
      runId,
      workflowId: definition.workflowId,
      workflowVersion: definition.version,
      status: "running",
      input,
      context,
      stepHistory: [],
      startedAt: new Date(),
    };

    this.runs.set(runId, run);
    return this._executeSteps(definition, run);
  }

  async resume(
    runId: string,
    resumeInput: WorkflowResumeInput
  ): Promise<WorkflowResult> {
    const run = this.runs.get(runId);
    if (!run) {
      return { runId, status: "failed", error: `local.run.not_found: ${runId}` };
    }
    if (run.status !== "paused") {
      return {
        runId,
        status: "failed",
        error: `local.run.not_paused: run is ${run.status}`,
      };
    }

    const definition = this.definitions.get(run.workflowId);
    if (!definition) {
      return { runId, status: "failed", error: "local.definition.not_found" };
    }

    const pausedStep = definition.steps.find(
      (s) => s.stepId === run.context.currentStepId
    ) as HumanReviewStep | undefined;

    if (!pausedStep || pausedStep.type !== "human-review") {
      return { runId, status: "failed", error: "local.resume.invalid_step" };
    }

    // Record the human decision on the in-progress step record
    const record = run.stepHistory.find(
      (r) => r.stepId === pausedStep.stepId && r.status === "running"
    );
    if (record) {
      record.status = "completed";
      record.output = { decision: resumeInput.decision, annotations: resumeInput.annotations };
      record.completedAt = new Date();
    }

    run.context.stepOutputs[pausedStep.stepId] = { decision: resumeInput.decision };

    const nextStepId =
      resumeInput.decision === "accept" ? pausedStep.onAccept : pausedStep.onReject;

    if (nextStepId === "complete") return this._completeRun(run);
    if (nextStepId === "fail") return this._failRun(run, "creator rejected at human-review step");

    run.status = "running";
    run.pausedAt = undefined;
    run.context.currentStepId = nextStepId;

    return this._executeSteps(definition, run);
  }

  async status(runId: string): Promise<RunStatus> {
    const run = this.runs.get(runId);
    if (!run) {
      return { runId, workflowId: "unknown", status: "failed", stepHistory: [] };
    }
    return {
      runId: run.runId,
      workflowId: run.workflowId,
      status: run.status,
      currentStepId: run.context.currentStepId,
      stepHistory: run.stepHistory,
    };
  }

  async cancel(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (run && (run.status === "running" || run.status === "paused")) {
      run.status = "cancelled";
      run.completedAt = new Date();
    }
  }

  // ──────────────────────────────────────────────
  // Internal execution engine
  // ──────────────────────────────────────────────

  private async _executeSteps(
    definition: WorkflowDefinition,
    run: WorkflowRun
  ): Promise<WorkflowResult> {
    const stepMap = new Map<string, WorkflowStep>(
      definition.steps.map((s) => [s.stepId, s])
    );

    let currentStepId = run.context.currentStepId;

    while (currentStepId && currentStepId !== "complete") {
      const step = stepMap.get(currentStepId);
      if (!step) {
        return this._failRun(
          run,
          `local.step.not_found: ${currentStepId} not in definition`
        );
      }

      run.context.currentStepId = currentStepId;

      const record: WorkflowStepRecord = {
        stepId: step.stepId,
        type: step.type,
        status: "running",
        startedAt: new Date(),
      };
      run.stepHistory.push(record);

      if (step.type === "human-review") {
        run.status = "paused";
        run.pausedAt = new Date();
        // Record stays "running" until resume() closes it
        return {
          runId: run.runId,
          status: "paused",
          pausedAt: {
            stepId: step.stepId,
            prompt: step.prompt,
            acceptLabel: step.acceptLabel,
            rejectLabel: step.rejectLabel,
          },
        };
      }

      // Phase-1 stub: non-review steps return placeholder output.
      // Real delegation to orchestrator/agents/connectors/runners comes in later phases.
      const stubOutput = this._stubOutput(step);
      record.output = stubOutput;
      record.status = "completed";
      record.completedAt = new Date();
      run.context.stepOutputs[step.stepId] = stubOutput;

      const nextStepId = step.onSuccess;
      if (nextStepId === "complete") return this._completeRun(run);
      if (nextStepId === "fail") {
        return this._failRun(run, `step ${step.stepId} onSuccess directed to fail`);
      }
      currentStepId = nextStepId;
    }

    return this._completeRun(run);
  }

  private _stubOutput(step: WorkflowStep): unknown {
    switch (step.type) {
      case "agent":
        return { stubbed: true, agentRole: step.agentRole };
      case "connector":
        return { stubbed: true, connectorId: step.connectorId, capabilityType: step.capabilityType };
      case "runner":
        return { stubbed: true, runnerId: step.runnerId, taskType: step.taskType };
      case "knowledge":
        return { stubbed: true, operation: step.operation };
      case "storage":
        return { stubbed: true, operation: step.operation, storageKey: step.storageKey };
      default:
        return { stubbed: true };
    }
  }

  private _completeRun(run: WorkflowRun): WorkflowResult {
    run.status = "completed";
    run.completedAt = new Date();
    const result: WorkflowResult = {
      runId: run.runId,
      status: "completed",
      output: run.context.stepOutputs,
      completedAt: run.completedAt,
    };
    run.result = result;
    return result;
  }

  private _failRun(run: WorkflowRun, error: string): WorkflowResult {
    run.status = "failed";
    run.completedAt = new Date();
    const result: WorkflowResult = {
      runId: run.runId,
      status: "failed",
      error,
      completedAt: run.completedAt,
    };
    run.result = result;
    return result;
  }
}
