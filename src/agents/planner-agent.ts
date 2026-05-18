import type { AgentRole, AgentInput, AgentOutput } from "./port.js";
import type { AgentLLMClient } from "./llm-client.js";
import { PLANNER_SYSTEM_PROMPT } from "../knowledge/planner/system-prompt.js";
import { parsePlannerOutput } from "../knowledge/planner/output-schema.js";
import type { PlannerOutput, TaskSpec } from "../knowledge/planner/output-schema.js";
import type { FeatureSpec } from "../knowledge/architect/output-schema.js";

export interface PlannerAgentResult extends PlannerOutput {
  featureId: string;
  epicId: string;
  featureDir: string;
  feature: FeatureSpec;    // passed through for downstream (OP) steps
  planPath: string;
  tasksPath: string;
  decisionLogPath: string;
  tasksJsonl: string;
  artifacts: Array<{ path: string; content: string }>;
}

export class PlannerAgent implements AgentRole {
  readonly agentId = "planner";

  constructor(private readonly client: AgentLLMClient) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const feature = input.context?.feature as FeatureSpec | undefined;
    const arch = typeof input.context?.arch === "string" ? input.context.arch : "";
    const ideaId = (input.context?.ideaId as string) ?? "unknown-idea";
    const epicDir = (input.context?.epicDir as string) ?? `docs/plans/${ideaId}`;
    const plansDir = (input.context?.plansDir as string) ?? "docs/plans";

    if (!feature) {
      throw new Error("PlannerAgent: missing 'feature' in context");
    }

    const featureId = feature.feature_id;
    const featureSlug = feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const featureDir = epicDir
      ? `${epicDir}/${featureId}-${featureSlug}`
      : `${plansDir}/${ideaId}/${feature.epic_id}/${featureId}-${featureSlug}`;

    const userPrompt =
      `## Feature to plan\n\n` +
      `Feature ID: ${featureId}\n` +
      `Epic ID: ${feature.epic_id}\n` +
      `Title: ${feature.title}\n` +
      `Summary: ${feature.summary}\n` +
      `Interfaces: ${feature.interfaces.join("; ")}\n\n` +
      `## Architecture context\n\n${arch}`;

    const raw = await this.client.complete(PLANNER_SYSTEM_PROMPT, userPrompt);
    const parsed = parsePlannerOutput(raw);

    const tasksJsonl = parsed.tasks
      .map((t: TaskSpec) => JSON.stringify(t))
      .join("\n");

    const planPath = `${featureDir}/plan.md`;
    const tasksPath = `${featureDir}/tasks.jsonl`;
    const decisionLogPath = `${featureDir}/decision-log.md`;

    const result: PlannerAgentResult = {
      ...parsed,
      featureId,
      epicId: feature.epic_id,
      featureDir,
      feature,
      planPath,
      tasksPath,
      decisionLogPath,
      tasksJsonl,
      artifacts: [
        { path: planPath, content: parsed.plan },
        { path: tasksPath, content: tasksJsonl },
        { path: decisionLogPath, content: parsed.decision_log },
      ],
    };

    return { agentRole: this.agentId, result };
  }
}
