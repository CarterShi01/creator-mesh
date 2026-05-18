/**
 * Phase 2 replacement for the shell-out implementations of checkRunStatus
 * and createClaudeTask in shell-controller-adapter.ts.
 *
 * Uses GitHubDispatchService (TypeScript / Octokit) instead of spawning
 * bash scripts. Drop-in compatible: same function signatures and return shapes.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createGitHubConnector } from "../../capabilities/connectors/github/index.js";
import type { RunStatus } from "../../capabilities/connectors/github/index.js";

const runtimeDir = () =>
  process.env["CREATORMESH_RUNTIME_DIR"] ?? path.join(os.homedir(), "creator-mesh-runtime");

const projectsFile = () =>
  process.env["CREATORMESH_PROJECTS_FILE"] ?? path.join(runtimeDir(), "config", "projects.yaml");

const runsFile = () =>
  process.env["CREATORMESH_RUNS_FILE"] ?? path.join(runtimeDir(), "runs", "runs.jsonl");

// ── Project registry ─────────────────────────────────────────────────────────

interface ProjectEntry {
  id: string;
  repo: string;
  executor: string;
}

function parseProjectsYaml(content: string): ProjectEntry[] {
  const projects: ProjectEntry[] = [];
  let current: Partial<ProjectEntry> = {};
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    const idM = line.match(/^-\s+id:\s*(.+)/);
    if (idM) {
      if (current.id) projects.push(current as ProjectEntry);
      current = { id: idM[1].trim().replace(/['"]/g, "") };
      continue;
    }
    const repoM = line.match(/^repo:\s*(.+)/);
    if (repoM && current.id) current.repo = repoM[1].trim().replace(/['"]/g, "");
    const execM = line.match(/^executor:\s*(.+)/);
    if (execM && current.id) current.executor = execM[1].trim().replace(/['"]/g, "");
  }
  if (current.id) projects.push(current as ProjectEntry);
  return projects;
}

async function getProjectRepo(projectId: string): Promise<string> {
  const content = await fs.readFile(projectsFile(), "utf-8");
  const projects = parseProjectsYaml(content);
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error(`Project not found in registry: "${projectId}"`);
  return project.repo;
}

// ── Service factory (lazy-init, cached per process) ──────────────────────────

let _service: ReturnType<typeof createGitHubConnector>["service"] | null = null;

function getService() {
  if (!_service) {
    const { service } = createGitHubConnector();
    _service = service;
  }
  return _service;
}

// ── JSONL bridge writer (Phase 1.5 compat: keep runs.jsonl up-to-date) ───────

async function appendRunRecord(record: Record<string, unknown>): Promise<void> {
  try {
    const file = runsFile();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(record) + "\n", "utf-8");
  } catch {
    // Non-fatal: JSONL write failure should not block dispatch
  }
}

// ── Public API — same signatures as shell-controller-adapter ─────────────────

/**
 * Check the live GitHub status of a dispatched task.
 * Returns a human-readable status string compatible with what the LLM expects.
 */
export async function checkRunStatus(
  projectId: string,
  issueNumber: string | number
): Promise<{ output: string }> {
  const repo = await getProjectRepo(projectId);
  const service = getService();
  const status: RunStatus = await service.checkRunStatus({
    repo,
    issueNumber: Number(issueNumber),
  });
  return { output: formatRunStatus(status) };
}

/**
 * Dispatch a new task to a managed project via GitHub issue + @claude comment.
 * Returns a formatted dispatch summary compatible with what the LLM expects.
 */
export async function createClaudeTask(
  projectId: string,
  title: string,
  body: string
): Promise<{ stdout: string; stderr: string }> {
  const repo = await getProjectRepo(projectId);
  const service = getService();

  const result = await service.dispatchTask({ repo, title, body, projectId });

  // Bridge: also append to runs.jsonl for backward compat with list_runs.sh
  await appendRunRecord({
    created_at: new Date().toISOString(),
    kind: "task",
    project_id: projectId,
    repo,
    executor: "claude-code",
    issue_number: String(result.issueNumber),
    issue_url: result.issueUrl,
    title,
    plan_id: "",
    task_id: "",
    status: "dispatched",
  });

  const stdout = [
    "Dispatch completed.",
    `Project:  ${projectId}`,
    `Repo:     ${repo}`,
    `Issue:    ${result.issueUrl}`,
    `Run ID:   ${result.runId}`,
  ].join("\n");

  return { stdout, stderr: "" };
}

// ── Formatter ────────────────────────────────────────────────────────────────

function formatRunStatus(s: RunStatus): string {
  const lines: string[] = [`overall: ${s.overall}`];

  if (s.issueState) lines.push(`issue_state: ${s.issueState}`);

  if (s.pr) {
    lines.push(`pr_number: ${s.pr.number}`);
    lines.push(`pr_url: ${s.pr.url}`);
    lines.push(`pr_state: ${s.pr.state}`);
    if (s.pr.mergedAt) lines.push(`pr_merged_at: ${s.pr.mergedAt}`);
    if (s.pr.headRefName) lines.push(`pr_branch: ${s.pr.headRefName}`);
  }

  if (s.workflowRun) {
    lines.push(`workflow_status: ${s.workflowRun.status}`);
    if (s.workflowRun.conclusion) lines.push(`workflow_conclusion: ${s.workflowRun.conclusion}`);
    lines.push(`workflow_url: ${s.workflowRun.url}`);
  }

  return lines.join("\n");
}
