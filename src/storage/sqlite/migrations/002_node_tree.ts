import type Database from "better-sqlite3";

export function migration002(db: Database.Database): void {
  db.exec(`
    -- Widen workflow_definitions.kind to include tree node types
    -- SQLite doesn't support ALTER COLUMN CHECK, so we rebuild the table.
    CREATE TABLE workflow_definitions_new (
      id            TEXT PRIMARY KEY,
      kind          TEXT NOT NULL CHECK (kind IN ('plan','task','epic','feature','idea')),
      idea_id       TEXT NOT NULL,
      task_id       TEXT,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      version       TEXT NOT NULL DEFAULT '1',
      project_id    TEXT REFERENCES managed_projects(id) ON DELETE SET NULL,
      body          TEXT NOT NULL DEFAULT '',
      artifact_path TEXT,
      -- Tree node extensions (nullable for backward compatibility)
      node_type       TEXT CHECK (node_type IN ('idea','epic','feature','task') OR node_type IS NULL),
      parent_node_id  TEXT REFERENCES workflow_definitions_new(id) ON DELETE SET NULL,
      produced_by_role TEXT CHECK (produced_by_role IN ('pm','architect','planner','op','human') OR produced_by_role IS NULL),
      role_phase      TEXT CHECK (role_phase IN ('pending','running','produced','approved') OR role_phase IS NULL),
      depth           INTEGER,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    INSERT INTO workflow_definitions_new
      (id, kind, idea_id, task_id, name, description, version, project_id,
       body, artifact_path, created_at, updated_at)
    SELECT id, kind, idea_id, task_id, name, description, version, project_id,
           body, artifact_path, created_at, updated_at
    FROM workflow_definitions;

    DROP TABLE workflow_definitions;
    ALTER TABLE workflow_definitions_new RENAME TO workflow_definitions;

    CREATE INDEX idx_wd_idea ON workflow_definitions(idea_id);
    CREATE INDEX idx_wd_kind ON workflow_definitions(kind);
    CREATE INDEX idx_wd_parent ON workflow_definitions(parent_node_id) WHERE parent_node_id IS NOT NULL;

    -- Widen workflow_runs to support tree run hierarchy
    ALTER TABLE workflow_runs ADD COLUMN parent_run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL;
    CREATE INDEX idx_wr_parent ON workflow_runs(parent_run_id) WHERE parent_run_id IS NOT NULL;

    -- Widen relations to support tree-level links
    CREATE TABLE relations_new (
      from_id       TEXT NOT NULL,
      to_id         TEXT NOT NULL,
      relation_type TEXT NOT NULL CHECK (relation_type IN (
        'task_depends_on',
        'plan_contains_task',
        'plan_tracked_by_issue',
        'plan_planned_by_issue',
        'plan_contains_plan',
        'node_produced_by_role',
        'node_depends_on'
      )),
      created_at    TEXT NOT NULL,
      PRIMARY KEY (from_id, to_id, relation_type)
    );

    INSERT INTO relations_new SELECT * FROM relations;
    DROP TABLE relations;
    ALTER TABLE relations_new RENAME TO relations;

    CREATE INDEX idx_rel_from ON relations(from_id, relation_type);
    CREATE INDEX idx_rel_to   ON relations(to_id,   relation_type);
  `);
}
