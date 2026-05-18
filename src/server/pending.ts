// In-memory store for turns that returned needs_approval.
// Maps turnId → the info callToolWithApproval needs to resume.
import type { RuntimeToolName } from "../runtime/tools/controller-tools.js";

export interface PendingApproval {
  turnId: string;
  sessionId: string;
  toolName: RuntimeToolName;
  toolArgs: Record<string, unknown>;
  createdAt: Date;
}

const store = new Map<string, PendingApproval>();

export function savePending(approval: PendingApproval): void {
  store.set(approval.turnId, approval);
}

export function getPending(turnId: string): PendingApproval | undefined {
  return store.get(turnId);
}

export function deletePending(turnId: string): void {
  store.delete(turnId);
}
