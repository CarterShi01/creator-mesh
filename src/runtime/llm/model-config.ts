export interface LLMModelConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// Default only applies when using Anthropic directly (no base URL configured).
// When using a third-party provider, set CREATORMESH_RUNTIME_MODEL explicitly.
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export function loadModelConfig(): LLMModelConfig {
  // CREATORMESH_API_KEY takes precedence over ANTHROPIC_API_KEY.
  // This lets the runtime use a different provider key (e.g. lkeap)
  // without conflicting with ANTHROPIC_API_KEY set in the shell for
  // other tools (Claude Code, GitHub Actions, etc.).
  const apiKey =
    process.env["CREATORMESH_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "No API key found. Set CREATORMESH_API_KEY (preferred) or ANTHROPIC_API_KEY " +
        "before starting the CreatorMesh runtime."
    );
  }

  // CREATORMESH_BASE_URL takes precedence over ANTHROPIC_BASE_URL.
  const baseUrl =
    process.env["CREATORMESH_BASE_URL"] ??
    process.env["ANTHROPIC_BASE_URL"] ??
    undefined;

  const model = process.env["CREATORMESH_RUNTIME_MODEL"] ?? DEFAULT_MODEL;
  return { apiKey, model, baseUrl };
}
