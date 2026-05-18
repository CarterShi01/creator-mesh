// Public barrel for src/storage.
// Portability constraint: no SQL strings in this file — all SQL lives in src/storage/sqlite/ only.

export type {
  WorkflowDefinitionRecord,
  WorkflowRunRecord,
  RelationRow,
  RelationType,
  PlanProgressRollup,
} from "./types.js";

export type { WorkflowDefinitionStore } from "./ports/workflow-definition-store.js";
export type { WorkflowRunStore } from "./ports/workflow-run-store.js";
export type { ManagedProjectStore } from "./ports/managed-project-store.js";
export type { RelationStore } from "./ports/relation-store.js";

import { openDb, closeDb } from "./sqlite/db.js";
import { SqliteWorkflowDefinitionStore } from "./sqlite/workflow-definition-store-sqlite.js";
import { SqliteWorkflowRunStore } from "./sqlite/workflow-run-store-sqlite.js";
import { SqliteManagedProjectStore } from "./sqlite/managed-project-store-sqlite.js";
import { SqliteRelationStore } from "./sqlite/relation-store-sqlite.js";
import type Database from "better-sqlite3";

export { openDb, closeDb };
export { SqliteWorkflowDefinitionStore };
export { SqliteWorkflowRunStore };
export { SqliteManagedProjectStore };
export { SqliteRelationStore };

export type { ImportOptions, ImportResult } from "./import/import-from-jsonl.js";
export { importFromJsonl } from "./import/import-from-jsonl.js";

export interface SqliteStores {
  db: Database.Database;
  definitions: SqliteWorkflowDefinitionStore;
  runs: SqliteWorkflowRunStore;
  projects: SqliteManagedProjectStore;
  relations: SqliteRelationStore;
}

/**
 * Opens (or returns cached) the default SQLite database and returns all four
 * stores ready to use. Pass a path to open a separate instance (e.g. ":memory:" for tests).
 */
export function createSqliteStores(dbPath?: string): SqliteStores {
  const db = openDb(dbPath);
  return {
    db,
    definitions: new SqliteWorkflowDefinitionStore(db),
    runs: new SqliteWorkflowRunStore(db),
    projects: new SqliteManagedProjectStore(db),
    relations: new SqliteRelationStore(db),
  };
}
