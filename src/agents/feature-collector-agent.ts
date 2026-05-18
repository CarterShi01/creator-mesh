/**
 * FeatureCollectorAgent
 *
 * Pure TypeScript aggregation agent — no LLM call.
 * Takes the architect fan-out results (one per epic) and flattens
 * all features into a single list, attaching the architecture context
 * (arch string + epicDir) to each feature for use by the PlannerAgent.
 *
 * Input context:
 *   archResults: ArchitectAgentResult[] — from FanoutStep output
 *
 * Output:
 *   featureContexts: FeatureContext[] — one entry per feature across all epics
 */
import type { AgentRole, AgentInput, AgentOutput } from "./port.js";
import type { ArchitectAgentResult } from "./architect-agent.js";
import type { FeatureSpec } from "../knowledge/architect/output-schema.js";

export interface FeatureContext {
  feature: FeatureSpec;
  arch: string;
  epicId: string;
  epicDir: string;
}

export class FeatureCollectorAgent implements AgentRole {
  readonly agentId = "feature-collector";

  async execute(input: AgentInput): Promise<AgentOutput> {
    // archResults is the raw FanoutStep output: an array of child workflow outputs.
    // Each child output is a Record<string, unknown> where the "arch-analysis" key
    // holds the ArchitectAgentResult.
    const rawResults = input.context?.archResults as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(rawResults)) {
      throw new Error("FeatureCollectorAgent: 'archResults' must be an array");
    }

    const featureContexts: FeatureContext[] = [];

    for (const childOutput of rawResults) {
      // The architect child workflow stores agent output under its outputKey
      const archResult = (childOutput["arch-analysis"] ?? childOutput) as ArchitectAgentResult;
      if (!archResult || !Array.isArray(archResult.features)) continue;

      for (const feature of archResult.features) {
        featureContexts.push({
          feature,
          arch: archResult.arch,
          epicId: archResult.epicId,
          epicDir: archResult.epicDir ?? "",
        });
      }
    }

    return {
      agentRole: this.agentId,
      result: { featureContexts },
    };
  }
}
