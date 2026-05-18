import type { AgentRole, AgentInput, AgentOutput } from "./port.js";
import type { AgentLLMClient } from "./llm-client.js";
import { PM_SYSTEM_PROMPT } from "../knowledge/pm/system-prompt.js";
import { parsePMOutput } from "../knowledge/pm/output-schema.js";
import type { PMOutput, EpicSpec } from "../knowledge/pm/output-schema.js";

export interface PMAgentResult extends PMOutput {
  prdPath: string;
  epicsPath: string;
  epicsJsonl: string;
  artifacts: Array<{ path: string; content: string }>;
}

export class PMAgent implements AgentRole {
  readonly agentId = "pm";

  constructor(private readonly client: AgentLLMClient) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const brief =
      typeof input.context?.brief === "string" ? input.context.brief : input.task;
    const repos =
      Array.isArray(input.context?.repos)
        ? (input.context.repos as string[]).join(", ")
        : "none";
    const ideaId = (input.context?.ideaId as string) ?? "unknown-idea";
    const plansDir = (input.context?.plansDir as string) ?? "docs/plans";

    const userPrompt = `## Idea Brief\n\n${brief}\n\n## Existing managed repositories\n\n${repos}`;

    const raw = await this.client.complete(PM_SYSTEM_PROMPT, userPrompt);
    const parsed = parsePMOutput(raw);

    const epicsJsonl = parsed.epics
      .map((e: EpicSpec) => JSON.stringify(e))
      .join("\n");

    const prdPath = `${plansDir}/${ideaId}/prd.md`;
    const epicsPath = `${plansDir}/${ideaId}/epics.jsonl`;

    const result: PMAgentResult = {
      ...parsed,
      epicsJsonl,
      prdPath,
      epicsPath,
      artifacts: [
        { path: prdPath, content: parsed.prd },
        { path: epicsPath, content: epicsJsonl },
      ],
    };

    return { agentRole: this.agentId, result };
  }
}
