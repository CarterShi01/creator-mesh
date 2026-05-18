/**
 * Shared LLM client interface for all CreatorMesh agents.
 *
 * Respects CREATORMESH_API_KEY / CREATORMESH_BASE_URL / CREATORMESH_RUNTIME_MODEL
 * so the runtime can use a third-party Anthropic-compatible provider (e.g. lkeap)
 * without conflicting with the shell's ANTHROPIC_API_KEY used by Claude Code.
 */

export interface AgentLLMClient {
  complete(system: string, user: string): Promise<string>;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export class CreatorMeshLLMClient implements AgentLLMClient {
  private _anthropic: unknown = null;

  async complete(system: string, user: string): Promise<string> {
    if (!this._anthropic) {
      const apiKey =
        process.env["CREATORMESH_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"];
      if (!apiKey) {
        throw new Error(
          "No API key found. Set CREATORMESH_API_KEY or ANTHROPIC_API_KEY."
        );
      }
      const baseURL =
        process.env["CREATORMESH_BASE_URL"] ?? process.env["ANTHROPIC_BASE_URL"];
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      this._anthropic = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
    }

    const model =
      process.env["CREATORMESH_RUNTIME_MODEL"] ?? DEFAULT_MODEL;

    const anthropic = this._anthropic as {
      messages: {
        create(params: unknown): Promise<{
          content: Array<{ type: string; text?: string }>;
        }>;
      };
    };

    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    });

    return response.content.find((b) => b.type === "text")?.text ?? "";
  }
}
