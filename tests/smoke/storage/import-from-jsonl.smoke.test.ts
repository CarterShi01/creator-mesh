import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { runMigrations } from "../../../src/storage/sqlite/schema.js";
import { SqliteWorkflowDefinitionStore } from "../../../src/storage/sqlite/workflow-definition-store-sqlite.js";
import { SqliteWorkflowRunStore } from "../../../src/storage/sqlite/workflow-run-store-sqlite.js";
import { SqliteManagedProjectStore } from "../../../src/storage/sqlite/managed-project-store-sqlite.js";
import { SqliteRelationStore } from "../../../src/storage/sqlite/relation-store-sqlite.js";
import { importFromJsonl } from "../../../src/storage/import/import-from-jsonl.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

const FIXTURE_PLANS_DIR = path.join(process.cwd(), "docs", "plans");
const FIXTURE_RUNS_FILE = path.join(os.homedir(), "creator-mesh-runtime", "runs", "runs.jsonl");
const FIXTURE_PLANS_INDEX = path.join(os.homedir(), "creator-mesh-runtime", "plans", "index.jsonl");
const FIXTURE_PROJECTS_YAML = path.join(process.cwd(), "configs", "projects.example.yaml");

describe("importFromJsonl (integration — uses real fixture files)", () => {
  let db: Database.Database;
  let definitions: SqliteWorkflowDefinitionStore;
  let runs: SqliteWorkflowRunStore;
  let projects: SqliteManagedProjectStore;
  let relations: SqliteRelationStore;

  beforeEach(() => {
    db = freshDb();
    definitions = new SqliteWorkflowDefinitionStore(db);
    runs = new SqliteWorkflowRunStore(db);
    projects = new SqliteManagedProjectStore(db);
    relations = new SqliteRelationStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("imports projects from projects.example.yaml", () => {
    const result = importFromJsonl(projects, definitions, runs, relations, {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    });
    expect(result.projects).toBeGreaterThan(0);
    expect(projects.list().length).toBeGreaterThan(0);
  });

  it("imports plan and task definitions from docs/plans/", () => {
    const result = importFromJsonl(projects, definitions, runs, relations, {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    });
    expect(result.planDefinitions).toBeGreaterThan(0);
    expect(result.taskDefinitions).toBeGreaterThan(0);

    const planDef = definitions.get("plan:2026-05-18-idea-ranking");
    expect(planDef).not.toBeNull();
    expect(planDef?.kind).toBe("plan");

    const tasks = definitions.getPlanTasks("2026-05-18-idea-ranking");
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("imports task_depends_on relations from tasks.jsonl", () => {
    importFromJsonl(projects, definitions, runs, relations, {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    });
    // T02 depends on T01 in the fixture
    const deps = relations.getDependencies("task:2026-05-18-idea-ranking:T02");
    expect(deps).toContain("task:2026-05-18-idea-ranking:T01");
  });

  it("getDependents returns who depends on T01", () => {
    importFromJsonl(projects, definitions, runs, relations, {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    });
    // T02, T03, T04 all depend on T01
    const dependents = relations.getDependents("task:2026-05-18-idea-ranking:T01");
    expect(dependents.length).toBeGreaterThanOrEqual(1);
  });

  it("import is idempotent — running twice produces same counts", () => {
    const opts = {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    };
    importFromJsonl(projects, definitions, runs, relations, opts);
    const countAfterFirst = definitions.list().length;
    importFromJsonl(projects, definitions, runs, relations, opts);
    expect(definitions.list().length).toBe(countAfterFirst);
  });

  it("planProgress returns zero for unknown idea", () => {
    importFromJsonl(projects, definitions, runs, relations, {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    });
    const progress = runs.planProgress("no-such-idea");
    expect(progress.total).toBe(0);
  });

  it("imports runs.jsonl task runs when file exists", () => {
    if (!fs.existsSync(FIXTURE_RUNS_FILE)) return;
    const result = importFromJsonl(projects, definitions, runs, relations, {
      projectsFile: FIXTURE_PROJECTS_YAML,
      runsFile: FIXTURE_RUNS_FILE,
      plansArtifactDir: FIXTURE_PLANS_DIR,
    });
    expect(result.taskRuns + result.planRuns).toBeGreaterThan(0);
  });
});
