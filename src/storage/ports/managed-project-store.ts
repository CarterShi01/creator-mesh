import type { ManagedProject } from "../../workflows/types.js";

export interface ManagedProjectStore {
  upsert(project: ManagedProject): void;
  get(id: string): ManagedProject | null;
  list(): ManagedProject[];
  delete(id: string): void;
}
