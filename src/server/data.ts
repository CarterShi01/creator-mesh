// Read-only access to ~/creator-mesh-runtime/ data files.
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const RUNTIME_DIR =
  process.env["CREATORMESH_RUNTIME_DIR"] ?? path.join(os.homedir(), "creator-mesh-runtime");

async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}

function parseProjectsYaml(content: string): object[] {
  const projects: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    const idMatch = line.match(/^-\s+id:\s*(.+)/);
    if (idMatch) {
      if (current["id"]) projects.push(current);
      current = { id: idMatch[1].trim().replace(/['"]/g, "") };
      continue;
    }
    for (const field of ["repo", "executor", "default_branch"]) {
      const m = line.match(new RegExp(`^${field}:\\s*(.+)`));
      if (m && current["id"]) current[field] = m[1].trim().replace(/['"]/g, "");
    }
    for (const field of ["allow_direct_merge", "allow_deploy"]) {
      const m = line.match(new RegExp(`^${field}:\\s*(.+)`));
      if (m && current["id"]) current[field] = m[1].trim();
    }
  }
  if (current["id"]) projects.push(current);
  return projects;
}

export async function getRuns(): Promise<object[]> {
  return readJsonl(path.join(RUNTIME_DIR, "runs", "runs.jsonl"));
}

export async function getPlans(): Promise<object[]> {
  return readJsonl(path.join(RUNTIME_DIR, "plans", "index.jsonl"));
}

export async function getProjects(): Promise<object[]> {
  try {
    const content = await fs.readFile(
      path.join(RUNTIME_DIR, "config", "projects.yaml"),
      "utf-8"
    );
    return parseProjectsYaml(content);
  } catch {
    return [];
  }
}
