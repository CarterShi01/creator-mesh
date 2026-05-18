import type { RelationRow, RelationType } from "../types.js";

export interface RelationStore {
  add(rel: Omit<RelationRow, "createdAt">): void;
  remove(rel: Omit<RelationRow, "createdAt">): void;
  /** IDs this node depends on (things that must complete before it). */
  getDependencies(id: string): string[];
  /** IDs that depend on this node (things waiting for it to complete). */
  getDependents(id: string): string[];
  /** Definition IDs of tasks contained in a plan, ordered by task_id. */
  getPlanTasks(planDefinitionId: string): string[];
  listFrom(fromId: string, type?: RelationType): RelationRow[];
  listTo(toId: string, type?: RelationType): RelationRow[];
}
