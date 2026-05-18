// Types mirroring the backend contract. Update as src/runtime/ evolves.

export type RuntimeStatus =
  | "received"
  | "planning"
  | "tool_selected"
  | "needs_approval"
  | "executing"
  | "completed"
  | "blocked"
  | "failed";

export type RuntimeEventType =
  | "input_received"
  | "llm_started"
  | "llm_completed"
  | "intent_interpreted"
  | "tool_selected"
  | "permission_checked"
  | "tool_started"
  | "tool_completed"
  | "tool_failed"
  | "response_created";

export interface RuntimeEvent {
  id: string;
  sessionId: string;
  turnId: string;
  type: RuntimeEventType;
  message?: string;
  data?: unknown;
  createdAt: string;
}

export interface RuntimeTurnResult {
  sessionId: string;
  turnId: string;
  status: RuntimeStatus;
  finalResponse: string;
  selectedToolName?: string;
  toolResult?: unknown;
  events: RuntimeEvent[];
}

export interface ApproveRequest {
  decision: "approve" | "reject";
  feedback?: string;
}

// --- Data models from ~/creator-mesh-runtime/ ---

export interface WorkflowRun {
  created_at: string;
  project_id: string;
  repo: string;
  executor: string;
  issue_number: number;
  issue_url: string;
  title: string;
  status: "dispatched" | "merged" | "workflow_failed" | "pr_closed_without_merge" | string;
  kind?: "task" | "plan";
  plan_id?: string;
  task_id?: string;
}

export interface Plan {
  created_at: string;
  idea_id: string;
  primary_project_id: string;
  plan_artifact_path: string;
  planning_issue_url: string;
  tracker_issue_url?: string;
  status: "planning" | "plan_ready" | "dispatching" | "dispatched" | "completed";
  updated_at?: string;
}

export interface ManagedProject {
  id: string;
  repo: string;
  default_branch: string;
  executor: string;
  allow_direct_merge: boolean;
  allow_deploy: boolean;
}

// --- Client-side chat model ---

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: RuntimeStatus;
  turnId?: string;
  createdAt: Date;
}
