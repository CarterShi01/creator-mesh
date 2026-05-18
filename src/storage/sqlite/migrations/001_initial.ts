import type Database from "better-sqlite3";

export function migration001(db: Database.Database): void {
  db.exec(`
    CREATE TABLE managed_projects (
      id                 TEXT PRIMARY KEY,
      repo               TEXT NOT NULL,
      default_branch     TEXT NOT NULL,
      executor           TEXT NOT NULL,
      allow_direct_merge INTEGER NOT NULL DEFAULT 0,
      allow_deploy       INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    CREATE TABLE workflow_definitions (
      id            TEXT PRIMARY KEY,
      kind          TEXT NOT NULL CHECK (kind IN ('plan','task')),
      idea_id       TEXT NOT NULL,
      task_id       TEXT,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      version       TEXT NOT NULL DEFAULT '1',
      project_id    TEXT REFERENCES managed_projects(id) ON DELETE SET NULL,
      body          TEXT NOT NULL DEFAULT '',
      artifact_path TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );
    CREATE INDEX idx_wd_idea ON workflow_definitions(idea_id);
    CREATE INDEX idx_wd_kind ON workflow_definitions(kind);

    CREATE TABLE workflow_runs (
      id                 TEXT PRIMARY KEY,
      kind               TEXT NOT NULL CHECK (kind IN ('plan','task')),
      idea_id            TEXT,
      task_id            TEXT,
      project_id         TEXT REFERENCES managed_projects(id) ON DELETE SET NULL,
      repo               TEXT,
      executor           TEXT,
      issue_number       TEXT,
      issue_url          TEXT,
      pr_number          TEXT,
      pr_url             TEXT,
      planning_issue_url TEXT,
      tracker_issue_url  TEXT,
      title              TEXT,
      status             TEXT NOT NULL,
      created_at         TEXT NOT NULL,
      status_updated_at  TEXT,
      completed_at       TEXT
    );
    CREATE INDEX idx_wr_idea   ON workflow_runs(idea_id);
    CREATE INDEX idx_wr_status ON workflow_runs(status);
    CREATE INDEX idx_wr_issue  ON workflow_runs(issue_number);

    CREATE TABLE relations (
      from_id       TEXT NOT NULL,
      to_id         TEXT NOT NULL,
      relation_type TEXT NOT NULL CHECK (relation_type IN (
        'task_depends_on',
        'plan_contains_task',
        'plan_tracked_by_issue',
        'plan_planned_by_issue'
      )),
      created_at    TEXT NOT NULL,
      PRIMARY KEY (from_id, to_id, relation_type)
    );
    CREATE INDEX idx_rel_from ON relations(from_id, relation_type);
    CREATE INDEX idx_rel_to   ON relations(to_id,   relation_type);

    CREATE VIEW plan_progress_v AS
    SELECT
      idea_id,
      COUNT(*)                                                       AS total,
      SUM(CASE WHEN status = 'merged'             THEN 1 ELSE 0 END) AS merged,
      SUM(CASE WHEN status = 'needs_human_review' THEN 1 ELSE 0 END) AS needs_review,
      SUM(CASE WHEN status IN (
        'workflow_failed', 'pr_closed_without_merge'
      )                                                              THEN 1 ELSE 0 END) AS failed
    FROM workflow_runs
    WHERE kind = 'task'
    GROUP BY idea_id;
  `);
}
