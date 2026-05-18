# tools/

ControllerPanel tool definitions and registry.

- `controller-tools.ts` — `RuntimeTool` interface and `RuntimeToolName` union type
- `tool-registry.ts` — `getToolRegistry()` returns a `Map<RuntimeToolName, RuntimeTool>` with the four Phase 1 tools

Current tools: `list_projects`, `list_runs`, `check_run_status`, `create_claude_task` (approval required).
