import type { AgentRole, AgentInput, AgentOutput } from "./port.js";
import type { AgentLLMClient } from "./llm-client.js";
import { OP_SYSTEM_PROMPT } from "../knowledge/op/system-prompt.js";
import { parseOPOutput } from "../knowledge/op/output-schema.js";
import type { OPOutput } from "../knowledge/op/output-schema.js";
import type { FeatureSpec } from "../knowledge/architect/output-schema.js";
import type { TaskSpec } from "../knowledge/planner/output-schema.js";
import { stringify as yamlStringify } from "./yaml-lite.js";

export interface OPAgentResult extends OPOutput {
  featureId: string;
  acceptancePath: string;
  execPlanPath: string;
  execPlanYaml: string;
  artifacts: Array<{ path: string; content: string }>;
}

export class OPAgent implements AgentRole {
  readonly agentId = "op";

  constructor(private readonly client: AgentLLMClient) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const feature = input.context?.feature as FeatureSpec | undefined;
    const tasks = input.context?.tasks as TaskSpec[] | undefined;
    const featureDir = (input.context?.featureDir as string) ?? "docs/plans/unknown";

    if (!feature || !tasks) {
      throw new Error("OPAgent: missing 'feature' or 'tasks' in context");
    }

    const taskList = tasks
      .map((t) => `- ${t.task_id}: ${t.title}`)
      .join("\n");

    const userPrompt =
      `## Feature\n\n` +
      `Feature ID: ${feature.feature_id}\n` +
      `Title: ${feature.title}\n` +
      `Summary: ${feature.summary}\n\n` +
      `## Implementation tasks\n\n${taskList}`;

    const raw = await this.client.complete(OP_SYSTEM_PROMPT, userPrompt);
    const parsed = parseOPOutput(raw);

    const acceptancePath = `${featureDir}/acceptance.md`;
    const execPlanPath = `${featureDir}/exec-plan.yaml`;
    const execPlanYaml = yamlStringify(parsed.exec_plan);

    const result: OPAgentResult = {
      ...parsed,
      featureId: feature.feature_id,
      acceptancePath,
      execPlanPath,
      execPlanYaml,
      artifacts: [
        { path: acceptancePath, content: parsed.acceptance },
        { path: execPlanPath, content: execPlanYaml },
      ],
    };

    return { agentRole: this.agentId, result };
  }
}
