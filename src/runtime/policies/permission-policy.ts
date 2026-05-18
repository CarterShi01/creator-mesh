import type { RuntimeToolName } from "../tools/controller-tools.js";

export type PermissionDecision = "allowed" | "needs_approval" | "denied";

const POLICY: Record<RuntimeToolName, PermissionDecision> = {
  list_projects: "allowed",
  list_runs: "allowed",
  check_run_status: "allowed",
  create_claude_task: "needs_approval",
  none: "denied",
};

export function checkPermission(toolName: RuntimeToolName): PermissionDecision {
  return POLICY[toolName] ?? "denied";
}
