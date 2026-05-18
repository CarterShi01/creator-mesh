import type Database from "better-sqlite3";
import type { ManagedProjectStore } from "../ports/managed-project-store.js";
import type { ManagedProject } from "../../workflows/types.js";

interface ProjectRow {
  id: string;
  repo: string;
  default_branch: string;
  executor: string;
  allow_direct_merge: number;
  allow_deploy: number;
  created_at: string;
  updated_at: string;
}

function toRecord(row: ProjectRow): ManagedProject {
  return {
    id: row.id,
    repo: row.repo,
    defaultBranch: row.default_branch,
    executor: row.executor as ManagedProject["executor"],
    allowDirectMerge: row.allow_direct_merge === 1,
    allowDeploy: row.allow_deploy === 1,
  };
}

export class SqliteManagedProjectStore implements ManagedProjectStore {
  private upsertStmt: Database.Statement;
  private getStmt: Database.Statement;
  private listStmt: Database.Statement;
  private deleteStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO managed_projects (id, repo, default_branch, executor,
        allow_direct_merge, allow_deploy, created_at, updated_at)
      VALUES (@id, @repo, @defaultBranch, @executor,
        @allowDirectMerge, @allowDeploy, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        repo              = excluded.repo,
        default_branch    = excluded.default_branch,
        executor          = excluded.executor,
        allow_direct_merge = excluded.allow_direct_merge,
        allow_deploy      = excluded.allow_deploy,
        updated_at        = excluded.updated_at
    `);
    this.getStmt = db.prepare("SELECT * FROM managed_projects WHERE id = ?");
    this.listStmt = db.prepare("SELECT * FROM managed_projects ORDER BY id");
    this.deleteStmt = db.prepare("DELETE FROM managed_projects WHERE id = ?");
  }

  upsert(project: ManagedProject): void {
    const now = new Date().toISOString();
    this.upsertStmt.run({
      id: project.id,
      repo: project.repo,
      defaultBranch: project.defaultBranch,
      executor: project.executor,
      allowDirectMerge: project.allowDirectMerge ? 1 : 0,
      allowDeploy: project.allowDeploy ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  get(id: string): ManagedProject | null {
    const row = this.getStmt.get(id) as ProjectRow | undefined;
    return row ? toRecord(row) : null;
  }

  list(): ManagedProject[] {
    return (this.listStmt.all() as ProjectRow[]).map(toRecord);
  }

  delete(id: string): void {
    this.deleteStmt.run(id);
  }
}
