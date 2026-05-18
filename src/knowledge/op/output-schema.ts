export interface ExecPlan {
  feature_id: string;
  dispatch_mode: "sequential" | "parallel";  // Phase A: always "sequential"
  parallel_groups: string[][];               // Phase A: always []
  governance: {
    per_task_human_review: boolean;
    feature_completion_review: boolean;
  };
}

export interface OPOutput {
  acceptance: string;    // acceptance criteria markdown
  exec_plan: ExecPlan;
}

export function parseOPOutput(raw: string): OPOutput {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`OPAgent: failed to parse JSON: ${trimmed.slice(0, 200)}`);
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.acceptance !== "string" || typeof obj.exec_plan !== "object") {
    throw new Error("OPAgent: output missing required fields");
  }
  return {
    acceptance: obj.acceptance,
    exec_plan: obj.exec_plan as ExecPlan,
  };
}
