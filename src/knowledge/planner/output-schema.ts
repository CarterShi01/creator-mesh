export interface TaskSpec {
  task_id: string;       // e.g. "T01"
  title: string;         // max 72 chars, action verb
  body: string;          // GitHub issue body markdown
  depends_on: string[];  // other task_ids; empty array if none
}

export interface PlannerOutput {
  plan: string;          // human-readable plan markdown
  tasks: TaskSpec[];
  decision_log: string;  // key decisions markdown
}

export function parsePlannerOutput(raw: string): PlannerOutput {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`PlannerAgent: failed to parse JSON: ${trimmed.slice(0, 200)}`);
  }
  const obj = parsed as Record<string, unknown>;
  if (
    typeof obj.plan !== "string" ||
    !Array.isArray(obj.tasks) ||
    typeof obj.decision_log !== "string"
  ) {
    throw new Error("PlannerAgent: output missing required fields");
  }
  return {
    plan: obj.plan,
    tasks: obj.tasks as TaskSpec[],
    decision_log: obj.decision_log,
  };
}
