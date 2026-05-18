export type RuntimeToolName =
  | "list_projects"
  | "create_claude_task"
  | "list_runs"
  | "check_run_status"
  | "none";

export interface RuntimeTool<TArgs = unknown, TResult = unknown> {
  name: RuntimeToolName;
  description: string;
  requiresApproval?: boolean;
  run(args: TArgs): Promise<TResult>;
}
