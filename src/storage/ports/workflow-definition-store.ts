import type { WorkflowDefinitionRecord } from "../types.js";

export interface WorkflowDefinitionStore {
  upsert(record: WorkflowDefinitionRecord): void;
  get(id: string): WorkflowDefinitionRecord | null;
  /** Returns plan definition + all its task definitions. */
  getByIdea(ideaId: string): WorkflowDefinitionRecord[];
  /** Returns task definitions only, ordered by task_id ascending (topological input order). */
  getPlanTasks(ideaId: string): WorkflowDefinitionRecord[];
  list(filter?: { kind?: "plan" | "task"; projectId?: string }): WorkflowDefinitionRecord[];
}
