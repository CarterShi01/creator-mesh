import type Database from "better-sqlite3";
import type { WorkflowDefinitionStore } from "../ports/workflow-definition-store.js";
import type { WorkflowDefinitionRecord } from "../types.js";

interface DefinitionRow {
  id: string;
  kind: "plan" | "task";
  idea_id: string;
  task_id: string | null;
  name: string;
  description: string;
  version: string;
  project_id: string | null;
  body: string;
  artifact_path: string | null;
  created_at: string;
  updated_at: string;
}

function toRecord(row: DefinitionRow): WorkflowDefinitionRecord {
  return {
    id: row.id,
    kind: row.kind,
    ideaId: row.idea_id,
    taskId: row.task_id ?? undefined,
    name: row.name,
    description: row.description,
    version: row.version,
    projectId: row.project_id ?? undefined,
    body: row.body,
    artifactPath: row.artifact_path ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteWorkflowDefinitionStore implements WorkflowDefinitionStore {
  private upsertStmt: Database.Statement;
  private getStmt: Database.Statement;
  private byIdeaStmt: Database.Statement;
  private planTasksStmt: Database.Statement;
  private listStmt: Database.Statement;
  private listByKindStmt: Database.Statement;
  private listByProjectStmt: Database.Statement;
  private listByKindAndProjectStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO workflow_definitions
        (id, kind, idea_id, task_id, name, description, version,
         project_id, body, artifact_path, created_at, updated_at)
      VALUES
        (@id, @kind, @ideaId, @taskId, @name, @description, @version,
         @projectId, @body, @artifactPath, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name          = excluded.name,
        description   = excluded.description,
        version       = excluded.version,
        project_id    = excluded.project_id,
        body          = excluded.body,
        artifact_path = excluded.artifact_path,
        updated_at    = excluded.updated_at
    `);
    this.getStmt = db.prepare(
      "SELECT * FROM workflow_definitions WHERE id = ?"
    );
    this.byIdeaStmt = db.prepare(
      "SELECT * FROM workflow_definitions WHERE idea_id = ? ORDER BY kind DESC, task_id ASC"
    );
    this.planTasksStmt = db.prepare(
      "SELECT * FROM workflow_definitions WHERE idea_id = ? AND kind = 'task' ORDER BY task_id ASC"
    );
    this.listStmt = db.prepare(
      "SELECT * FROM workflow_definitions ORDER BY idea_id, kind DESC, task_id ASC"
    );
    this.listByKindStmt = db.prepare(
      "SELECT * FROM workflow_definitions WHERE kind = ? ORDER BY idea_id, task_id ASC"
    );
    this.listByProjectStmt = db.prepare(
      "SELECT * FROM workflow_definitions WHERE project_id = ? ORDER BY idea_id, kind DESC, task_id ASC"
    );
    this.listByKindAndProjectStmt = db.prepare(
      "SELECT * FROM workflow_definitions WHERE kind = ? AND project_id = ? ORDER BY idea_id, task_id ASC"
    );
  }

  upsert(record: WorkflowDefinitionRecord): void {
    this.upsertStmt.run({
      id: record.id,
      kind: record.kind,
      ideaId: record.ideaId,
      taskId: record.taskId ?? null,
      name: record.name,
      description: record.description,
      version: record.version,
      projectId: record.projectId ?? null,
      body: record.body,
      artifactPath: record.artifactPath ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  get(id: string): WorkflowDefinitionRecord | null {
    const row = this.getStmt.get(id) as DefinitionRow | undefined;
    return row ? toRecord(row) : null;
  }

  getByIdea(ideaId: string): WorkflowDefinitionRecord[] {
    return (this.byIdeaStmt.all(ideaId) as DefinitionRow[]).map(toRecord);
  }

  getPlanTasks(ideaId: string): WorkflowDefinitionRecord[] {
    return (this.planTasksStmt.all(ideaId) as DefinitionRow[]).map(toRecord);
  }

  list(filter?: { kind?: "plan" | "task"; projectId?: string }): WorkflowDefinitionRecord[] {
    const { kind, projectId } = filter ?? {};
    let rows: DefinitionRow[];
    if (kind && projectId) {
      rows = this.listByKindAndProjectStmt.all(kind, projectId) as DefinitionRow[];
    } else if (kind) {
      rows = this.listByKindStmt.all(kind) as DefinitionRow[];
    } else if (projectId) {
      rows = this.listByProjectStmt.all(projectId) as DefinitionRow[];
    } else {
      rows = this.listStmt.all() as DefinitionRow[];
    }
    return rows.map(toRecord);
  }
}
