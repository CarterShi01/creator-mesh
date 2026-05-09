export type CapabilityType =
  | "read"
  | "search"
  | "create"
  | "update"
  | "append"
  | "delete"
  | "sync"
  | "subscribe"
  | "execute";

export type PermissionLevel =
  | "safe-read"
  | "write"
  | "destructive"
  | "external-side-effect";

export type ApprovalRequirement = "never" | "conditional" | "always";

export type ApprovalResult = "approved" | "rejected" | "auto-approved";

export type ActionStatus =
  | "pending"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rejected";

export type ResultStatus = "success" | "failure" | "partial";
