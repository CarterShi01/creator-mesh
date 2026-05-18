# policies/

Permission policy for the CreatorMesh runtime.

- `permission-policy.ts` — `checkPermission(toolName)` returns `"allowed" | "needs_approval" | "denied"`

Current policy: read tools auto-allowed; `create_claude_task` requires human approval; unknown tools denied.
