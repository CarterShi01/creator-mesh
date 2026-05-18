import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../sqlite/schema.js";
import { SqliteWorkflowDefinitionStore } from "../sqlite/workflow-definition-store-sqlite.js";
import { SqliteWorkflowRunStore } from "../sqlite/workflow-run-store-sqlite.js";
import { SqliteManagedProjectStore } from "../sqlite/managed-project-store-sqlite.js";
import { SqliteRelationStore } from "../sqlite/relation-store-sqlite.js";
import type { WorkflowDefinitionRecord, WorkflowRunRecord } from "../types.js";
import type { ManagedProject } from "../../workflows/types.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

describe("SqliteManagedProjectStore", () => {
  let store: SqliteManagedProjectStore;

  beforeEach(() => {
    store = new SqliteManagedProjectStore(freshDb());
  });

  const project: ManagedProject = {
    id: "idea-factory",
    repo: "CarterShi01/idea-factory",
    defaultBranch: "master",
    executor: "claude-code",
    allowDirectMerge: false,
    allowDeploy: false,
  };

  it("upserts and retrieves a project", () => {
    store.upsert(project);
    expect(store.get("idea-factory")).toMatchObject({ id: "idea-factory", repo: "CarterShi01/idea-factory" });
  });

  it("lists all projects", () => {
    store.upsert(project);
    store.upsert({ ...project, id: "creator-mesh", repo: "CarterShi01/creator-mesh" });
    expect(store.list()).toHaveLength(2);
  });

  it("deletes a project", () => {
    store.upsert(project);
    store.delete("idea-factory");
    expect(store.get("idea-factory")).toBeNull();
  });

  it("upsert is idempotent", () => {
    store.upsert(project);
    store.upsert({ ...project, repo: "CarterShi01/updated-repo" });
    expect(store.get("idea-factory")?.repo).toBe("CarterShi01/updated-repo");
    expect(store.list()).toHaveLength(1);
  });
});

describe("SqliteWorkflowDefinitionStore", () => {
  let store: SqliteWorkflowDefinitionStore;
  let projectStore: SqliteManagedProjectStore;
  const now = new Date().toISOString();

  const planDef: WorkflowDefinitionRecord = {
    id: "plan:2026-05-18-idea-ranking",
    kind: "plan",
    ideaId: "2026-05-18-idea-ranking",
    name: "Idea Ranking",
    description: "",
    version: "1",
    body: "",
    artifactPath: "docs/plans/2026-05-18-idea-ranking/",
    createdAt: now,
    updatedAt: now,
  };

  const taskDef: WorkflowDefinitionRecord = {
    id: "task:2026-05-18-idea-ranking:T01",
    kind: "task",
    ideaId: "2026-05-18-idea-ranking",
    taskId: "T01",
    name: "Add stable id field",
    description: "",
    version: "1",
    projectId: "idea-factory",
    body: "Add 8-char sha256 id field",
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    const db = freshDb();
    projectStore = new SqliteManagedProjectStore(db);
    store = new SqliteWorkflowDefinitionStore(db);
    // Pre-insert project so FK constraint is satisfied
    projectStore.upsert({
      id: "idea-factory",
      repo: "CarterShi01/idea-factory",
      defaultBranch: "master",
      executor: "claude-code",
      allowDirectMerge: false,
      allowDeploy: false,
    });
  });

  it("upserts and retrieves a plan definition", () => {
    store.upsert(planDef);
    const found = store.get("plan:2026-05-18-idea-ranking");
    expect(found).toMatchObject({ kind: "plan", ideaId: "2026-05-18-idea-ranking" });
  });

  it("upserts and retrieves a task definition", () => {
    store.upsert(taskDef);
    const found = store.get("task:2026-05-18-idea-ranking:T01");
    expect(found).toMatchObject({ kind: "task", taskId: "T01", projectId: "idea-factory" });
  });

  it("getByIdea returns plan and tasks", () => {
    store.upsert(planDef);
    store.upsert(taskDef);
    const all = store.getByIdea("2026-05-18-idea-ranking");
    expect(all).toHaveLength(2);
  });

  it("getPlanTasks returns only tasks", () => {
    store.upsert(planDef);
    store.upsert(taskDef);
    const tasks = store.getPlanTasks("2026-05-18-idea-ranking");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].kind).toBe("task");
  });

  it("list filters by kind", () => {
    store.upsert(planDef);
    store.upsert(taskDef);
    expect(store.list({ kind: "plan" })).toHaveLength(1);
    expect(store.list({ kind: "task" })).toHaveLength(1);
  });

  it("upsert is idempotent", () => {
    store.upsert(planDef);
    store.upsert({ ...planDef, name: "Updated Name" });
    expect(store.get(planDef.id)?.name).toBe("Updated Name");
    expect(store.list()).toHaveLength(1);
  });
});

describe("SqliteWorkflowRunStore", () => {
  let store: SqliteWorkflowRunStore;
  let projectStore: SqliteManagedProjectStore;
  const now = new Date().toISOString();

  const taskRun: WorkflowRunRecord = {
    id: "run-abc123",
    kind: "task",
    ideaId: "2026-05-18-idea-ranking",
    taskId: "T01",
    projectId: "idea-factory",
    repo: "CarterShi01/idea-factory",
    executor: "claude-code",
    issueNumber: "8",
    issueUrl: "https://github.com/CarterShi01/idea-factory/issues/8",
    title: "Add stable id field",
    status: "dispatched",
    createdAt: now,
  };

  const taskRun2: WorkflowRunRecord = {
    ...taskRun,
    id: "run-def456",
    taskId: "T02",
    issueNumber: "9",
    issueUrl: "https://github.com/CarterShi01/idea-factory/issues/9",
    status: "merged",
    statusUpdatedAt: now,
  };

  beforeEach(() => {
    const db = freshDb();
    projectStore = new SqliteManagedProjectStore(db);
    store = new SqliteWorkflowRunStore(db);
    projectStore.upsert({
      id: "idea-factory",
      repo: "CarterShi01/idea-factory",
      defaultBranch: "master",
      executor: "claude-code",
      allowDirectMerge: false,
      allowDeploy: false,
    });
  });

  it("creates and retrieves a run", () => {
    store.create(taskRun);
    expect(store.get("run-abc123")).toMatchObject({ kind: "task", status: "dispatched" });
  });

  it("create is idempotent (ON CONFLICT DO NOTHING)", () => {
    store.create(taskRun);
    store.create({ ...taskRun, status: "merged" });
    // Second create should not overwrite
    expect(store.get("run-abc123")?.status).toBe("dispatched");
  });

  it("updateStatus changes status", () => {
    store.create(taskRun);
    store.updateStatus("run-abc123", "merged", now);
    expect(store.get("run-abc123")?.status).toBe("merged");
  });

  it("updatePr stores pr fields", () => {
    store.create(taskRun);
    store.updatePr("run-abc123", "42", "https://github.com/CarterShi01/idea-factory/pull/42");
    expect(store.get("run-abc123")?.prNumber).toBe("42");
  });

  it("list filters by ideaId and status", () => {
    store.create(taskRun);
    store.create(taskRun2);
    expect(store.list({ ideaId: "2026-05-18-idea-ranking" })).toHaveLength(2);
    expect(store.list({ status: "merged" })).toHaveLength(1);
  });

  it("findByIssue locates a run by repo and issue number", () => {
    store.create(taskRun);
    const found = store.findByIssue("CarterShi01/idea-factory", "8");
    expect(found?.id).toBe("run-abc123");
  });

  it("planProgress aggregates merged and failed counts", () => {
    store.create(taskRun); // dispatched
    store.create(taskRun2); // merged
    store.create({
      ...taskRun,
      id: "run-ghi789",
      taskId: "T03",
      issueNumber: "10",
      status: "workflow_failed",
    });

    const progress = store.planProgress("2026-05-18-idea-ranking");
    expect(progress).toMatchObject({
      ideaId: "2026-05-18-idea-ranking",
      total: 3,
      merged: 1,
      failed: 1,
    });
  });
});

describe("SqliteRelationStore", () => {
  let store: SqliteRelationStore;

  beforeEach(() => {
    store = new SqliteRelationStore(freshDb());
  });

  const planId = "plan:2026-05-18-idea-ranking";
  const t01 = "task:2026-05-18-idea-ranking:T01";
  const t02 = "task:2026-05-18-idea-ranking:T02";
  const t03 = "task:2026-05-18-idea-ranking:T03";

  it("adds and lists relations", () => {
    store.add({ fromId: planId, toId: t01, relationType: "plan_contains_task" });
    expect(store.listFrom(planId, "plan_contains_task")).toHaveLength(1);
  });

  it("add is idempotent", () => {
    store.add({ fromId: planId, toId: t01, relationType: "plan_contains_task" });
    store.add({ fromId: planId, toId: t01, relationType: "plan_contains_task" });
    expect(store.listFrom(planId, "plan_contains_task")).toHaveLength(1);
  });

  it("removes a relation", () => {
    store.add({ fromId: planId, toId: t01, relationType: "plan_contains_task" });
    store.remove({ fromId: planId, toId: t01, relationType: "plan_contains_task" });
    expect(store.listFrom(planId, "plan_contains_task")).toHaveLength(0);
  });

  it("getDependencies: returns what a task depends on", () => {
    // T02 depends on T01
    store.add({ fromId: t02, toId: t01, relationType: "task_depends_on" });
    // T03 depends on T01 and T02
    store.add({ fromId: t03, toId: t01, relationType: "task_depends_on" });
    store.add({ fromId: t03, toId: t02, relationType: "task_depends_on" });

    expect(store.getDependencies(t02)).toEqual([t01]);
    expect(store.getDependencies(t03)).toHaveLength(2);
    expect(store.getDependencies(t01)).toHaveLength(0);
  });

  it("getDependents: returns who depends on a task", () => {
    store.add({ fromId: t02, toId: t01, relationType: "task_depends_on" });
    store.add({ fromId: t03, toId: t01, relationType: "task_depends_on" });

    const dependents = store.getDependents(t01);
    expect(dependents).toHaveLength(2);
    expect(dependents).toContain(t02);
    expect(dependents).toContain(t03);
    expect(store.getDependents(t02)).toHaveLength(0);
  });

  it("getPlanTasks returns task definition IDs under a plan", () => {
    store.add({ fromId: planId, toId: t01, relationType: "plan_contains_task" });
    store.add({ fromId: planId, toId: t02, relationType: "plan_contains_task" });
    expect(store.getPlanTasks(planId)).toEqual([t01, t02]);
  });
});
