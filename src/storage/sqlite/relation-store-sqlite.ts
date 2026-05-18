import type Database from "better-sqlite3";
import type { RelationStore } from "../ports/relation-store.js";
import type { RelationRow, RelationType } from "../types.js";

interface RelRow {
  from_id: string;
  to_id: string;
  relation_type: string;
  created_at: string;
}

function toRecord(row: RelRow): RelationRow {
  return {
    fromId: row.from_id,
    toId: row.to_id,
    relationType: row.relation_type as RelationType,
    createdAt: row.created_at,
  };
}

export class SqliteRelationStore implements RelationStore {
  private addStmt: Database.Statement;
  private removeStmt: Database.Statement;
  private depsStmt: Database.Statement;
  private dependentsStmt: Database.Statement;
  private planTasksStmt: Database.Statement;
  private listFromStmt: Database.Statement;
  private listFromTypedStmt: Database.Statement;
  private listToStmt: Database.Statement;
  private listToTypedStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.addStmt = db.prepare(`
      INSERT INTO relations (from_id, to_id, relation_type, created_at)
      VALUES (@fromId, @toId, @relationType, @createdAt)
      ON CONFLICT(from_id, to_id, relation_type) DO NOTHING
    `);
    this.removeStmt = db.prepare(
      "DELETE FROM relations WHERE from_id = ? AND to_id = ? AND relation_type = ?"
    );
    // task_depends_on: from=dependent, to=dependency. getDependencies = what I need.
    this.depsStmt = db.prepare(
      "SELECT to_id FROM relations WHERE from_id = ? AND relation_type = 'task_depends_on'"
    );
    this.dependentsStmt = db.prepare(
      "SELECT from_id FROM relations WHERE to_id = ? AND relation_type = 'task_depends_on'"
    );
    this.planTasksStmt = db.prepare(
      "SELECT to_id FROM relations WHERE from_id = ? AND relation_type = 'plan_contains_task' ORDER BY to_id ASC"
    );
    this.listFromStmt = db.prepare(
      "SELECT * FROM relations WHERE from_id = ? ORDER BY relation_type, to_id"
    );
    this.listFromTypedStmt = db.prepare(
      "SELECT * FROM relations WHERE from_id = ? AND relation_type = ? ORDER BY to_id"
    );
    this.listToStmt = db.prepare(
      "SELECT * FROM relations WHERE to_id = ? ORDER BY relation_type, from_id"
    );
    this.listToTypedStmt = db.prepare(
      "SELECT * FROM relations WHERE to_id = ? AND relation_type = ? ORDER BY from_id"
    );
  }

  add(rel: Omit<RelationRow, "createdAt">): void {
    this.addStmt.run({
      fromId: rel.fromId,
      toId: rel.toId,
      relationType: rel.relationType,
      createdAt: new Date().toISOString(),
    });
  }

  remove(rel: Omit<RelationRow, "createdAt">): void {
    this.removeStmt.run(rel.fromId, rel.toId, rel.relationType);
  }

  getDependencies(id: string): string[] {
    return (this.depsStmt.all(id) as { to_id: string }[]).map((r) => r.to_id);
  }

  getDependents(id: string): string[] {
    return (this.dependentsStmt.all(id) as { from_id: string }[]).map((r) => r.from_id);
  }

  getPlanTasks(planDefinitionId: string): string[] {
    return (this.planTasksStmt.all(planDefinitionId) as { to_id: string }[]).map((r) => r.to_id);
  }

  listFrom(fromId: string, type?: RelationType): RelationRow[] {
    const rows = type
      ? (this.listFromTypedStmt.all(fromId, type) as RelRow[])
      : (this.listFromStmt.all(fromId) as RelRow[]);
    return rows.map(toRecord);
  }

  listTo(toId: string, type?: RelationType): RelationRow[] {
    const rows = type
      ? (this.listToTypedStmt.all(toId, type) as RelRow[])
      : (this.listToStmt.all(toId) as RelRow[]);
    return rows.map(toRecord);
  }
}
