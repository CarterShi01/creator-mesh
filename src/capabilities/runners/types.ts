export type RunnerTaskType =
  | "read"
  | "plan"
  | "write"
  | "test"
  | "script"
  | "external"
  | "human";

export type RunnerPermissionLevel =
  | "safe-read"
  | "write"
  | "execute"
  | "external-side-effect"
  | "human";

export type ApprovalRequirement = "never" | "conditional" | "always";

export type RunnerResultStatus = "success" | "failure" | "partial" | "pending";

export type RunnerActionStatus =
  | "pending"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rejected";

export type ApprovalResult = "approved" | "rejected" | "auto-approved";
