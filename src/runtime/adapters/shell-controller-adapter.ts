import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is 3 levels up: adapters/ -> runtime/ -> src/ -> project root
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const SCRIPTS_DIR =
  process.env["CREATORMESH_SCRIPTS_DIR"] ?? path.join(PROJECT_ROOT, "scripts", "dispatch");

const RUNTIME_DIR =
  process.env["CREATORMESH_RUNTIME_DIR"] ?? path.join(os.homedir(), "creator-mesh-runtime");

const PROJECTS_FILE =
  process.env["CREATORMESH_PROJECTS_FILE"] ?? path.join(RUNTIME_DIR, "config", "projects.yaml");

interface Project {
  id: string;
  repo: string;
  executor: string;
}

interface ProjectList {
  projects: Project[];
}

function assertSafeId(value: string, label: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`${label} contains unsafe characters: "${value}"`);
  }
}

function parseProjectsYaml(content: string): ProjectList {
  const projects: Project[] = [];
  let current: Partial<Project> = {};

  for (const raw of content.split("\n")) {
    const line = raw.trim();

    const idMatch = line.match(/^-\s+id:\s*(.+)/);
    if (idMatch) {
      if (current.id) projects.push(current as Project);
      current = { id: idMatch[1].trim().replace(/['"]/g, "") };
      continue;
    }

    const repoMatch = line.match(/^repo:\s*(.+)/);
    if (repoMatch && current.id) {
      current.repo = repoMatch[1].trim().replace(/['"]/g, "");
    }

    const execMatch = line.match(/^executor:\s*(.+)/);
    if (execMatch && current.id) {
      current.executor = execMatch[1].trim().replace(/['"]/g, "");
    }
  }

  if (current.id) projects.push(current as Project);
  return { projects };
}

export async function listProjects(): Promise<ProjectList> {
  const content = await fs.readFile(PROJECTS_FILE, "utf-8");
  return parseProjectsYaml(content);
}

export async function listRuns(): Promise<{ output: string }> {
  const script = path.join(SCRIPTS_DIR, "list_runs.sh");
  const { stdout } = await execFileAsync("bash", [script], { timeout: 30_000 });
  return { output: stdout.trim() };
}

export async function checkRunStatus(
  projectId: string,
  issueNumber: string | number
): Promise<{ output: string }> {
  assertSafeId(projectId, "projectId");
  const issueStr = String(issueNumber);
  if (!/^\d+$/.test(issueStr)) {
    throw new Error(`issueNumber must be numeric, got: "${issueStr}"`);
  }
  const script = path.join(SCRIPTS_DIR, "check_run_status.sh");
  const { stdout } = await execFileAsync(
    "bash",
    [script, "--project", projectId, "--issue", issueStr],
    { timeout: 30_000 }
  );
  return { output: stdout.trim() };
}

export async function createClaudeTask(
  projectId: string,
  title: string,
  body: string
): Promise<{ stdout: string; stderr: string }> {
  assertSafeId(projectId, "projectId");
  const script = path.join(SCRIPTS_DIR, "create_claude_task.sh");
  const { stdout, stderr } = await execFileAsync(
    "bash",
    [script, "--project", projectId, "--title", title, "--body", body],
    { timeout: 60_000 }
  );
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
