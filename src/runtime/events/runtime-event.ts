export interface RuntimeEvent {
  id: string;
  sessionId: string;
  turnId: string;
  type:
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
  message?: string;
  data?: unknown;
  createdAt: string;
}
