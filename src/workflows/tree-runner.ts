/**
 * TreeWorkflowRunner
 *
 * Extends LocalWorkflowRunner behavior with support for FanoutStep, enabling
 * tree-structured workflow execution (idea → epics → features → tasks).
 *
 * Phase A constraints (enforced at runtime):
 *   - FanoutStep.parallelism is treated as 1 regardless of value.
 *   - Child workflows run sequentially and must complete (no HumanReviewStep inside children).
 *   - HumanReviewStep is supported only in the top-level (parent) workflow.
 *
 * Phase B upgrade path:
 *   - Replace the `for` loop in _executeFanout() with Promise.all() filtered by dependsOn.
 *   - No other changes needed.
 */
import { randomUUID } from "crypto";
import type {
  WorkflowRunnerPort,
  WorkflowDefinition,
  WorkflowResult,
  WorkflowRun,
  WorkflowContext,
  WorkflowStepRecord,
  WorkflowResumeInput,
  StepExecutor,
} from "./port.js";
import type { WorkflowInput, WorkflowStep, HumanReviewStep, FanoutStep } from "./types.js";
import { resolveRef, resolveInputMapping } from "./resolve-ref.js";

type RunStatus = {
  runId: string;
  workflowId: string;
  status: import("./types.js").WorkflowRunStatus;
  currentStepId?: string;
  stepHistory: WorkflowStepRecord[];
};

export class TreeWorkflowRunner implements WorkflowRunnerPort {
  readonly runnerId = "tree";

  private readonly runs = new Map<string, WorkflowRun>();
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly stepExecutor?: StepExecutor;

  constructor(stepExecutor?: StepExecutor) {
    this.stepExecutor = stepExecutor;
  }

  async execute(definition: WorkflowDefinition, input: WorkflowInput): Promise<WorkflowResult> {
    this.definitions.set(definition.workflowId, definition);

    const runId = randomUUID();
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

  async resume(runId: string, resumeInput: WorkflowResumeInput): Promise<WorkflowResult> {
    const run = this.runs.get(runId);
    if (!run) return { runId, status: "failed", error: `tree.run.not_found: ${runId}` };
    if (run.status !== "paused") {
      return { runId, status: "failed", error: `tree.run.not_paused: run is ${run.status}` };
    }

    const definition = this.definitions.get(run.workflowId);
    if (!definition) return { runId, status: "failed", error: "tree.definition.not_found" };

    const pausedStep = definition.steps.find(
      (s) => s.stepId === run.context.currentStepId
    ) as HumanReviewStep | undefined;

    if (!pausedStep || pausedStep.type !== "human-review") {
      return { runId, status: "failed", error: "tree.resume.invalid_step" };
    }

    const record = run.stepHistory.find(
      (r) => r.stepId === pausedStep.stepId && r.status === "running"
    );
    if (record) {
      record.status = "completed";
      record.output = { decision: resumeInput.decision, annotations: resumeInput.annotations };
      record.completedAt = new Date();
    }

    run.context.stepOutputs[pausedStep.stepId] = { decision: resumeInput.decision };
    const nextStepId = resumeInput.decision === "accept" ? pausedStep.onAccept : pausedStep.onReject;

    if (nextStepId === "complete") return this._completeRun(run);
    if (nextStepId === "fail") return this._failRun(run, "creator rejected at human-review step");

    run.status = "running";
    run.pausedAt = undefined;
    run.context.currentStepId = nextStepId;

    return this._executeSteps(definition, run);
  }

  async status(runId: string): Promise<RunStatus> {
    const run = this.runs.get(runId);
    if (!run) return { runId, workflowId: "unknown", status: "failed", stepHistory: [] };
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

  private async _executeSteps(definition: WorkflowDefinition, run: WorkflowRun): Promise<WorkflowResult> {
    const stepMap = new Map<string, WorkflowStep>(definition.steps.map((s) => [s.stepId, s]));
    let currentStepId = run.context.currentStepId;

    while (currentStepId && currentStepId !== "complete") {
      const step = stepMap.get(currentStepId);
      if (!step) {
        return this._failRun(run, `tree.step.not_found: ${currentStepId}`);
      }

      run.context.currentStepId = currentStepId;
      const record: WorkflowStepRecord = {
        stepId: step.stepId,
        type: step.type,
        status: "running",
        startedAt: new Date(),
      };
      run.stepHistory.push(record);

      // ── Human review gate ──────────────────────────────────────────────────
      if (step.type === "human-review") {
        run.status = "paused";
        run.pausedAt = new Date();
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

      // ── Fan-out ────────────────────────────────────────────────────────────
      if (step.type === "fanout") {
        const fanoutResult = await this._executeFanout(run, step);
        if (fanoutResult.status !== "completed") {
          record.status = "failed";
          record.error = fanoutResult.error ?? "fanout failed";
          record.completedAt = new Date();
          return fanoutResult;
        }
        const fanoutOutputs = fanoutResult.output as unknown[] | undefined;
        record.status = "completed";
        record.output = fanoutOutputs;
        record.completedAt = new Date();
        run.context.stepOutputs[step.stepId] = fanoutOutputs;
        const nextId = step.onSuccess;
        if (nextId === "complete") return this._completeRun(run);
        if (nextId === "fail") return this._failRun(run, "fanout onSuccess directed to fail");
        currentStepId = nextId;
        continue;
      }

      // ── Regular step (agent / connector / runner / etc.) ───────────────────
      let stepOutput: unknown;
      if (this.stepExecutor) {
        try {
          stepOutput = await this.stepExecutor.executeStep(
            step,
            run.input,
            run.context.stepOutputs
          );
        } catch (err) {
          record.status = "failed";
          record.error = err instanceof Error ? err.message : String(err);
          record.completedAt = new Date();
          return this._failRun(run, record.error);
        }
      } else {
        stepOutput = this._stubOutput(step);
      }

      record.output = stepOutput;
      record.status = "completed";
      record.completedAt = new Date();

      const outputKey = typeof (step as unknown as Record<string, unknown>)["outputKey"] === "string"
        ? ((step as unknown as Record<string, unknown>)["outputKey"] as string)
        : step.stepId;
      run.context.stepOutputs[outputKey] = stepOutput;
      run.context.stepOutputs[step.stepId] = stepOutput;

      const nextStepId = step.onSuccess;
      if (nextStepId === "complete") return this._completeRun(run);
      if (nextStepId === "fail") {
        return this._failRun(run, `step ${step.stepId} onSuccess directed to fail`);
      }
      currentStepId = nextStepId;
    }

    return this._completeRun(run);
  }

  // Phase A: sequential for-loop.
  // Phase B upgrade: replace for-loop with Promise.all, filtered by dependsOn.
  private async _executeFanout(run: WorkflowRun, step: FanoutStep): Promise<WorkflowResult> {
    const items = resolveRef(step.itemsMapping, run.input, run.context.stepOutputs);
    if (!Array.isArray(items)) {
      return this._failRun(
        run,
        `FanoutStep "${step.stepId}": itemsMapping "${step.itemsMapping}" did not resolve to an array (got ${typeof items})`
      );
    }

    const childDef = step.childWorkflow as WorkflowDefinition;
    const results: unknown[] = [];

    for (const item of items) {
      const childInput = resolveInputMapping(
        step.childInputMapping,
        run.input,
        run.context.stepOutputs,
        item
      );

      // Use a fresh runner instance for child so runs don't share state
      const childRunner = new TreeWorkflowRunner(this.stepExecutor);
      const childResult = await childRunner.execute(childDef, childInput);

      if (childResult.status !== "completed") {
        return {
          runId: run.runId,
          status: "failed",
          error: `FanoutStep "${step.stepId}" child failed: ${childResult.error ?? "unknown"}`,
        };
      }
      results.push(childResult.output);
    }

    return { runId: run.runId, status: "completed", output: results as unknown as Record<string, unknown> };
  }

  private _stubOutput(step: WorkflowStep): unknown {
    switch (step.type) {
      case "agent":
        return { stubbed: true, agentRole: step.agentRole };
      case "connector":
        return { stubbed: true, connectorId: step.connectorId };
      case "fanout":
        return { stubbed: true, type: "fanout", itemCount: 0 };
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
    const result: WorkflowResult = { runId: run.runId, status: "failed", error, completedAt: run.completedAt };
    run.result = result;
    return result;
  }
}
