export interface FeatureSpec {
  feature_id: string;    // e.g. "E01.F01"
  epic_id: string;       // e.g. "E01"
  title: string;
  summary: string;
  interfaces: string[];
  depends_on: string[];  // other feature_ids; empty for independent features
}

export interface ArchitectOutput {
  arch: string;          // full architecture doc as markdown
  features: FeatureSpec[];
  risks: string;         // risks markdown
  interfaces: string;    // interface contracts markdown
}

export function parseArchitectOutput(raw: string): ArchitectOutput {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`ArchitectAgent: failed to parse JSON: ${trimmed.slice(0, 200)}`);
  }
  const obj = parsed as Record<string, unknown>;
  if (
    typeof obj.arch !== "string" ||
    !Array.isArray(obj.features) ||
    typeof obj.risks !== "string" ||
    typeof obj.interfaces !== "string"
  ) {
    throw new Error("ArchitectAgent: output missing required fields");
  }
  return {
    arch: obj.arch,
    features: obj.features as FeatureSpec[],
    risks: obj.risks,
    interfaces: obj.interfaces,
  };
}
