export type ClaudeCodeErrorCode =
  | "claude-code.cli.not_found"
  | "claude-code.timeout"
  | "claude-code.exit_error"
  | "claude-code.parse_error"
  | "claude-code.task_type.unsupported";

export function classifyInvokeError(err: unknown): ClaudeCodeErrorCode {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("enoent") || msg.includes("not found") || msg.includes("no such file")) {
      return "claude-code.cli.not_found";
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return "claude-code.timeout";
    }
  }
  return "claude-code.exit_error";
}
