import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import type { SqliteManagedProjectStore } from "../sqlite/managed-project-store-sqlite.js";
import type { SqliteWorkflowDefinitionStore } from "../sqlite/workflow-definition-store-sqlite.js";
import type { SqliteWorkflowRunStore } from "../sqlite/workflow-run-store-sqlite.js";
import type { SqliteRelationStore } from "../sqlite/relation-store-sqlite.js";
import type { ManagedProject, RunnerType } from "../../workflows/types.js";
import type { WorkflowDefinitionRecord, WorkflowRunRecord } from "../types.js";

export interface ImportOptions {
  projectsFile?: string;
  runsFile?: string;
  plansIndexFile?: string;
  plansArtifactDir?: string;
}

export interface ImportResult {
  projects: number;
  planDefinitions: number;
  taskDefinitions: number;
  taskRuns: number;
  planRuns: number;
  relations: number;
}

interface RunsJsonlRecord {
  created_at: string;
  kind?: string;
  project_id?: string;
  repo?: string;
  executor?: string;
  issue_number?: string;
  issue_url?: string;
  title?: string;
  plan_id?: string;
  task_id?: string;
  status?: string;
  status_updated_at?: string;
}

interface PlansIndexRecord {
  created_at: string;
  updated_at?: string;
  idea_id?: string;
  primary_project_id?: string;
  plan_artifact_path?: string;
  planning_issue_url?: string;
  tracker_issue_url?: string;
  status?: string;
}

function runId(uniqueKey: string): string {
  return crypto.createHash("sha256").update(uniqueKey).digest("hex").slice(0, 24);
}

function readJsonlLines<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

function parsePlanTitle(planMdPath: string): string {
  if (!fs.existsSync(planMdPath)) return path.basename(path.dirname(planMdPath));
  const content = fs.readFileSync(planMdPath, "utf-8");
  const match = content.match(/^#\s+Plan:\s+(.+)$/m);
  return match ? match[1].trim() : path.basename(path.dirname(planMdPath));
}

function resolveProjectsFile(override?: string): string {
  return (
    override ??
    process.env["CREATORMESH_PROJECTS_FILE"] ??
    path.join(os.homedir(), "creator-mesh-runtime", "config", "projects.yaml")
  );
}

function resolveRunsFile(override?: string): string {
  return (
    override ??
    process.env["CREATORMESH_RUNS_FILE"] ??
    path.join(os.homedir(), "creator-mesh-runtime", "runs", "runs.jsonl")
  );
}

function resolvePlansIndexFile(override?: string): string {
  return (
    override ??
    process.env["CREATORMESH_PLANS_INDEX_FILE"] ??
    path.join(os.homedir(), "creator-mesh-runtime", "plans", "index.jsonl")
  );
}

function resolvePlansArtifactDir(override?: string): string {
  return override ?? path.join(process.cwd(), "docs", "plans");
}

function parseProjectsYaml(filePath: string): ManagedProject[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const projects: ManagedProject[] = [];

  // Hand-rolled parser matching the script convention (avoids yaml dep)
  const projectBlocks = content.split(/^  - id:/m).slice(1);
  for (const block of projectBlocks) {
    const lines = ("id:" + block).split("\n");
    const get = (key: string): string => {
      const line = lines.find((l) => l.trim().startsWith(`${key}:`));
      return line ? line.split(":").slice(1).join(":").trim() : "";
    };
    const id = get("id");
    if (!id) continue;
    projects.push({
      id,
      repo: get("repo"),
      defaultBranch: get("default_branch"),
      executor: (get("executor") || "claude-code") as RunnerType,
      allowDirectMerge: get("allow_direct_merge") === "true",
      allowDeploy: get("allow_deploy") === "true",
    });
  }
  return projects;
}

export function importFromJsonl(
  projectStore: SqliteManagedProjectStore,
  definitionStore: SqliteWorkflowDefinitionStore,
  runStore: SqliteWorkflowRunStore,
  relationStore: SqliteRelationStore,
  opts: ImportOptions = {}
): ImportResult {
  const result: ImportResult = {
    projects: 0,
    planDefinitions: 0,
    taskDefinitions: 0,
    taskRuns: 0,
    planRuns: 0,
    relations: 0,
  };

  const projectsFile = resolveProjectsFile(opts.projectsFile);
  const runsFile = resolveRunsFile(opts.runsFile);
  const plansIndexFile = resolvePlansIndexFile(opts.plansIndexFile);
  const plansArtifactDir = resolvePlansArtifactDir(opts.plansArtifactDir);

  const now = new Date().toISOString();

  // 1. Import managed projects from YAML
  const projects = parseProjectsYaml(projectsFile);
  for (const project of projects) {
    projectStore.upsert(project);
    result.projects++;
  }

  // 2. Import plan + task definitions from docs/plans/<idea-id>/
  if (fs.existsSync(plansArtifactDir)) {
    const ideaDirs = fs.readdirSync(plansArtifactDir).filter((d) => {
      const full = path.join(plansArtifactDir, d);
      return fs.statSync(full).isDirectory();
    });

    for (const ideaId of ideaDirs) {
      const ideaDir = path.join(plansArtifactDir, ideaId);
      const planMd = path.join(ideaDir, "plan.md");
      const tasksJsonl = path.join(ideaDir, "tasks.jsonl");
      const artifactPath = `docs/plans/${ideaId}/`;
      const planDefId = `plan:${ideaId}`;

      const planTitle = parsePlanTitle(planMd);
      const planDef: WorkflowDefinitionRecord = {
        id: planDefId,
        kind: "plan",
        ideaId,
        name: planTitle,
        description: "",
        version: "1",
        body: "",
        artifactPath,
        createdAt: now,
        updatedAt: now,
      };
      definitionStore.upsert(planDef);
      result.planDefinitions++;

      // Import tasks and build relations in one transaction
      if (fs.existsSync(tasksJsonl)) {
        interface TaskRecord {
          task_id: string;
          project_id?: string;
          title: string;
          body?: string;
          depends_on?: string[];
        }
        const tasks = readJsonlLines<TaskRecord>(tasksJsonl);

        for (const task of tasks) {
          const taskDefId = `task:${ideaId}:${task.task_id}`;
          const taskDef: WorkflowDefinitionRecord = {
            id: taskDefId,
            kind: "task",
            ideaId,
            taskId: task.task_id,
            name: task.title,
            description: "",
            version: "1",
            projectId: task.project_id,
            body: task.body ?? "",
            createdAt: now,
            updatedAt: now,
          };
          definitionStore.upsert(taskDef);
          result.taskDefinitions++;

          relationStore.add({ fromId: planDefId, toId: taskDefId, relationType: "plan_contains_task" });
          result.relations++;

          for (const dep of task.depends_on ?? []) {
            const depDefId = `task:${ideaId}:${dep}`;
            // task_depends_on: taskDefId depends on depDefId
            relationStore.add({ fromId: taskDefId, toId: depDefId, relationType: "task_depends_on" });
            result.relations++;
          }
        }
      }
    }
  }

  // 3. Import task runs from runs.jsonl
  const taskRuns = readJsonlLines<RunsJsonlRecord>(runsFile);
  for (const r of taskRuns) {
    const key = r.issue_url
      ? `${r.issue_url}:${r.task_id ?? ""}:${r.plan_id ?? ""}`
      : `${r.title ?? ""}:${r.created_at}`;
    const id = runId(key);

    const record: WorkflowRunRecord = {
      id,
      kind: r.kind === "plan" ? "plan" : "task",
      ideaId: r.plan_id || undefined,
      taskId: r.task_id || undefined,
      projectId: r.project_id || undefined,
      repo: r.repo || undefined,
      executor: (r.executor as RunnerType) || undefined,
      issueNumber: r.issue_number || undefined,
      issueUrl: r.issue_url || undefined,
      title: r.title || undefined,
      status: (r.status ?? "unknown") as WorkflowRunRecord["status"],
      createdAt: r.created_at,
      statusUpdatedAt: r.status_updated_at || undefined,
    };

    runStore.create(record);
    if (record.kind === "task") result.taskRuns++;
    else result.planRuns++;
  }

  // 4. Import plan runs from plans/index.jsonl
  const planRuns = readJsonlLines<PlansIndexRecord>(plansIndexFile);
  for (const r of planRuns) {
    const ideaId = r.idea_id;
    if (!ideaId) continue;

    const key = `planrun:${ideaId}`;
    const id = runId(key);

    const record: WorkflowRunRecord = {
      id,
      kind: "plan",
      ideaId,
      projectId: r.primary_project_id || undefined,
      planningIssueUrl: r.planning_issue_url || undefined,
      trackerIssueUrl: r.tracker_issue_url || undefined,
      status: (r.status ?? "unknown") as WorkflowRunRecord["status"],
      createdAt: r.created_at,
      statusUpdatedAt: r.updated_at || undefined,
    };

    runStore.create(record);
    result.planRuns++;

    if (r.tracker_issue_url) {
      const planDefId = `plan:${ideaId}`;
      relationStore.add({
        fromId: planDefId,
        toId: r.tracker_issue_url,
        relationType: "plan_tracked_by_issue",
      });
      result.relations++;
    }
    if (r.planning_issue_url) {
      const planDefId = `plan:${ideaId}`;
      relationStore.add({
        fromId: planDefId,
        toId: r.planning_issue_url,
        relationType: "plan_planned_by_issue",
      });
      result.relations++;
    }
  }

  return result;
}
