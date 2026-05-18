export interface LLMModelConfig {
  apiKey: string;
  model: string;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export function loadModelConfig(): LLMModelConfig {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is not set. " +
        "Set it to your Anthropic API key before starting the CreatorMesh runtime."
    );
  }
  const model = process.env["CREATORMESH_RUNTIME_MODEL"] ?? DEFAULT_MODEL;
  return { apiKey, model };
}
