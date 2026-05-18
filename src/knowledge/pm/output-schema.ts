export interface EpicSpec {
  epic_id: string;       // e.g. "E01"
  title: string;
  summary: string;
  user_value: string;
  scope_in: string[];
  scope_out: string[];
  depends_on: string[];  // other epic_ids; empty for independent epics
}

export interface PMOutput {
  prd: string;           // full PRD as markdown
  epics: EpicSpec[];
}

export function parsePMOutput(raw: string): PMOutput {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`PMAgent: failed to parse JSON output: ${trimmed.slice(0, 200)}`);
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.prd !== "string" || !Array.isArray(obj.epics)) {
    throw new Error("PMAgent: output missing required fields 'prd' and 'epics'");
  }
  return { prd: obj.prd, epics: obj.epics as EpicSpec[] };
}
