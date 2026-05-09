import type { AgentRole, AgentInput, AgentOutput } from "./port.js";

export interface ThoughtClassification {
  category: string;
  summary: string;
  tags: string[];
  confidence: number;
  suggestedTitle: string;
}

export interface ThoughtAgentClient {
  complete(system: string, user: string): Promise<string>;
}

const SYSTEM_PROMPT = `You are a thought classification assistant for a creator's personal knowledge system.

Given a raw thought, return a JSON object with exactly these fields:
- category: one of "idea", "task", "question", "reference", "reminder", "observation"
- summary: a concise 1-2 sentence summary of the thought
- tags: an array of 1-5 relevant lowercase tags
- confidence: a number from 0 to 1 indicating classification confidence
- suggestedTitle: a short title suitable for a Notion page (under 80 chars)

Respond ONLY with valid JSON. No markdown, no explanation.`;

function parseClassification(raw: string): ThoughtClassification {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`ThoughtAgent: failed to parse classification JSON: ${trimmed.slice(0, 100)}`);
  }
  const obj = parsed as Record<string, unknown>;
  if (
    typeof obj.category !== "string" ||
    typeof obj.summary !== "string" ||
    !Array.isArray(obj.tags) ||
    typeof obj.confidence !== "number" ||
    typeof obj.suggestedTitle !== "string"
  ) {
    throw new Error("ThoughtAgent: classification response missing required fields");
  }
  return {
    category: obj.category,
    summary: obj.summary,
    tags: obj.tags as string[],
    confidence: obj.confidence,
    suggestedTitle: obj.suggestedTitle,
  };
}

export class ThoughtAgent implements AgentRole {
  readonly agentId = "thought-agent";

  constructor(private readonly client: ThoughtAgentClient) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const thought =
      typeof input.context?.thought === "string"
        ? input.context.thought
        : input.task;

    const raw = await this.client.complete(SYSTEM_PROMPT, thought);
    const classification = parseClassification(raw);

    return {
      agentRole: this.agentId,
      result: classification,
    };
  }
}

export class AnthropicThoughtClient implements ThoughtAgentClient {
  private _anthropic: unknown = null;

  constructor(private readonly apiKey?: string) {}

  async complete(system: string, user: string): Promise<string> {
    if (!this._anthropic) {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      this._anthropic = new Anthropic({ apiKey: this.apiKey });
    }
    const anthropic = this._anthropic as {
      messages: {
        create(params: unknown): Promise<{
          content: Array<{ type: string; text?: string }>;
        }>;
      };
    };
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    return response.content.find((b) => b.type === "text")?.text ?? "";
  }
}
