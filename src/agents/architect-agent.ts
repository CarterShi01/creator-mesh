import type { AgentRole, AgentInput, AgentOutput } from "./port.js";
import type { AgentLLMClient } from "./llm-client.js";
import { ARCHITECT_SYSTEM_PROMPT } from "../knowledge/architect/system-prompt.js";
import { parseArchitectOutput } from "../knowledge/architect/output-schema.js";
import type { ArchitectOutput, FeatureSpec } from "../knowledge/architect/output-schema.js";
import type { EpicSpec } from "../knowledge/pm/output-schema.js";

export interface ArchitectAgentResult extends ArchitectOutput {
  epicId: string;
  epicDir: string;
  archPath: string;
  featuresPath: string;
  risksPath: string;
  interfacesPath: string;
  featuresJsonl: string;
  artifacts: Array<{ path: string; content: string }>;
}

export class ArchitectAgent implements AgentRole {
  readonly agentId = "architect";

  constructor(private readonly client: AgentLLMClient) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const epic = input.context?.epic as EpicSpec | undefined;
    const prd = typeof input.context?.prd === "string" ? input.context.prd : "";
    const ideaId = (input.context?.ideaId as string) ?? "unknown-idea";
    const plansDir = (input.context?.plansDir as string) ?? "docs/plans";

    if (!epic) {
      throw new Error("ArchitectAgent: missing 'epic' in context");
    }

    const epicId = epic.epic_id;
    const epicSlug = epic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const epicDir = `${plansDir}/${ideaId}/${epicId}-${epicSlug}`;

    const userPrompt =
      `## Epic to architect\n\n` +
      `Epic ID: ${epicId}\n` +
      `Title: ${epic.title}\n` +
      `Summary: ${epic.summary}\n` +
      `User value: ${epic.user_value}\n` +
      `In scope: ${epic.scope_in.join(", ")}\n` +
      `Out of scope: ${epic.scope_out.join(", ")}\n\n` +
      `## Full PRD context\n\n${prd}`;

    const raw = await this.client.complete(ARCHITECT_SYSTEM_PROMPT, userPrompt);
    const parsed = parseArchitectOutput(raw);

    const featuresJsonl = parsed.features
      .map((f: FeatureSpec) => JSON.stringify(f))
      .join("\n");

    const archPath = `${epicDir}/arch.md`;
    const featuresPath = `${epicDir}/features.jsonl`;
    const risksPath = `${epicDir}/risks.md`;
    const interfacesPath = `${epicDir}/interfaces.md`;

    const result: ArchitectAgentResult = {
      ...parsed,
      epicId,
      epicDir,
      archPath,
      featuresPath,
      risksPath,
      interfacesPath,
      featuresJsonl,
      artifacts: [
        { path: archPath, content: parsed.arch },
        { path: featuresPath, content: featuresJsonl },
        { path: risksPath, content: parsed.risks },
        { path: interfacesPath, content: parsed.interfaces },
      ],
    };

    return { agentRole: this.agentId, result };
  }
}
