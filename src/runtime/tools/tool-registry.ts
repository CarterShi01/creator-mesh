import type { RuntimeTool, RuntimeToolName } from "./controller-tools.js";
import * as shellAdapter from "../adapters/shell-controller-adapter.js";
import * as githubAdapter from "../adapters/github-dispatch-adapter.js";

interface CheckRunStatusArgs {
  projectId: string;
  issueNumber: string | number;
}

interface CreateClaudeTaskArgs {
  projectId: string;
  title: string;
  body: string;
}

const TOOL_DEFINITIONS: RuntimeTool[] = [
  {
    name: "list_projects",
    description: "List all managed projects in the CreatorMesh registry.",
    requiresApproval: false,
    run: () => shellAdapter.listProjects(),
  },
  {
    name: "list_runs",
    description: "Show recent task dispatch run records from the CreatorMesh run log.",
    requiresApproval: false,
    run: () => shellAdapter.listRuns(),
  },
  {
    name: "check_run_status",
    description:
      "Check live GitHub status of a dispatched task for a given project and issue number. " +
      "Args: { projectId: string, issueNumber: number }",
    requiresApproval: false,
    run: (args: unknown) => {
      const { projectId, issueNumber } = args as CheckRunStatusArgs;
      return githubAdapter.checkRunStatus(projectId, issueNumber);
    },
  },
  {
    name: "create_claude_task",
    description:
      "Dispatch a new task to a managed project by creating a GitHub issue and triggering " +
      "Claude Code. Requires human approval. " +
      "Args: { projectId: string, title: string, body: string }",
    requiresApproval: true,
    run: (args: unknown) => {
      const { projectId, title, body } = args as CreateClaudeTaskArgs;
      return githubAdapter.createClaudeTask(projectId, title, body);
    },
  },
];

export function getToolRegistry(): Map<RuntimeToolName, RuntimeTool> {
  const registry = new Map<RuntimeToolName, RuntimeTool>();
  for (const tool of TOOL_DEFINITIONS) {
    registry.set(tool.name, tool);
  }
  return registry;
}

export function getToolDescriptions(): Array<{ name: string; description: string; requiresApproval: boolean }> {
  return TOOL_DEFINITIONS.map(({ name, description, requiresApproval }) => ({
    name,
    description,
    requiresApproval: requiresApproval ?? false,
  }));
}
