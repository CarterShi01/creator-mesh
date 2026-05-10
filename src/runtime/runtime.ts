import type { ConnectorPort, ConnectorAction } from "../connectors/port.js";
import type { RunnerPort } from "../runners/port.js";
import type { AgentRole } from "../agents/port.js";
import type { StepExecutor } from "../workflows/port.js";
import type { WorkflowStep, WorkflowInput, StepInputMapping } from "../workflows/types.js";
import type { AgentStep, ConnectorStep, RunnerStep } from "../workflows/types.js";
import type { GovernanceEvaluator } from "../governance/index.js";

export class Runtime implements StepExecutor {
  constructor(
    private readonly agentRoles: Map<string, AgentRole>,
    private readonly connectors: Map<string, ConnectorPort>,
    private readonly runners: Map<string, RunnerPort>,
    private readonly governance?: GovernanceEvaluator
  ) {}

  async executeStep(
    step: WorkflowStep,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Promise<unknown> {
    switch (step.type) {
      case "agent":
        return this._executeAgentStep(step, workflowInput, stepOutputs);
      case "connector":
        return this._executeConnectorStep(step, workflowInput, stepOutputs);
      case "runner":
        return this._executeRunnerStep(step, workflowInput, stepOutputs);
      default:
        throw new Error(`Runtime: unsupported step type "${step.type}"`);
    }
  }

  private _resolveInputs(
    mapping: StepInputMapping,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, ref] of Object.entries(mapping)) {
      if (ref.startsWith("$input.")) {
        const field = ref.slice("$input.".length);
        resolved[key] = workflowInput[field];
      } else if (ref.startsWith("$steps.")) {
        const parts = ref.slice("$steps.".length).split(".");
        const [stepId, ...outputPath] = parts;
        let val: unknown = stepOutputs[stepId];
        for (const p of outputPath) {
          val = (val as Record<string, unknown>)?.[p];
        }
        resolved[key] = val;
      } else {
        resolved[key] = ref;
      }
    }
    return resolved;
  }

  // Returns true when any prior step output carries { decision: "accept" },
  // which is the output shape written by LocalWorkflowRunner for HumanReviewStep.
  private _hasAcceptedHumanReview(stepOutputs: Record<string, unknown>): boolean {
    return Object.values(stepOutputs).some(
      (output) =>
        typeof output === "object" &&
        output !== null &&
        (output as Record<string, unknown>).decision === "accept"
    );
  }

  private async _executeAgentStep(
    step: AgentStep,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Promise<unknown> {
    const agent = this.agentRoles.get(step.agentRole);
    if (!agent) {
      throw new Error(`Runtime: agent role not registered: "${step.agentRole}"`);
    }
    const context = this._resolveInputs(step.inputMapping, workflowInput, stepOutputs);
    const output = await agent.execute({
      agentRole: step.agentRole,
      task: step.description,
      context,
    });
    return output.result;
  }

  private async _executeConnectorStep(
    step: ConnectorStep,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Promise<unknown> {
    const connector = this.connectors.get(step.connectorId);
    if (!connector) {
      throw new Error(`Runtime: connector not registered: "${step.connectorId}"`);
    }
    const capability = connector.capabilities().get(step.capabilityType, step.resourceType);
    if (!capability) {
      throw new Error(
        `Runtime: connector "${step.connectorId}" does not support ${step.capabilityType}/${step.resourceType}`
      );
    }

    if (this.governance) {
      const govDecision = this.governance.evaluate(
        capability.permissionLevel,
        this._hasAcceptedHumanReview(stepOutputs)
      );
      if (govDecision.decision === "denied") {
        throw new Error(
          `Governance denied connector step "${step.stepId}" (${capability.permissionLevel}): ${govDecision.reason}`
        );
      }
      if (govDecision.decision === "requires-approval") {
        throw new Error(
          `Governance blocked connector step "${step.stepId}" (${capability.permissionLevel}): ${govDecision.reason}`
        );
      }
    }

    const payload = this._resolveInputs(step.inputMapping, workflowInput, stepOutputs);
    const action: ConnectorAction = {
      connectorId: step.connectorId,
      capability,
      resourceType: step.resourceType,
      payload,
      requestedAt: new Date(),
      status: "approved",
    };
    const result = await connector.execute(action);
    if (result.status === "failure") {
      throw new Error(result.error ?? `Connector step "${step.stepId}" failed`);
    }
    return result.data;
  }

  private async _executeRunnerStep(
    step: RunnerStep,
    workflowInput: WorkflowInput,
    stepOutputs: Record<string, unknown>
  ): Promise<unknown> {
    const runner = this.runners.get(step.runnerId);
    if (!runner) {
      throw new Error(`Runtime: runner not registered: "${step.runnerId}"`);
    }

    if (this.governance) {
      const cap = runner.registry().get(step.taskType);
      // If capability is not found in registry, deny by default when governance is active.
      const permLevel = cap?.permissionLevel ?? "execute";
      const govDecision = this.governance.evaluate(
        permLevel,
        this._hasAcceptedHumanReview(stepOutputs)
      );
      if (govDecision.decision === "denied") {
        throw new Error(
          `Governance denied runner step "${step.stepId}" (${permLevel}): ${govDecision.reason}`
        );
      }
      if (govDecision.decision === "requires-approval") {
        throw new Error(
          `Governance blocked runner step "${step.stepId}" (${permLevel}): ${govDecision.reason}`
        );
      }
    }

    const parameters = this._resolveInputs(step.inputMapping, workflowInput, stepOutputs);
    const result = await runner.execute({
      runnerId: step.runnerId,
      taskType: step.taskType,
      taskDescription: step.description,
      context: { parameters },
      requestedAt: new Date(),
      status: "approved",
    });
    if (result.status === "failure") {
      throw new Error(result.error ?? `Runner step "${step.stepId}" failed`);
    }
    return result.output;
  }
}
