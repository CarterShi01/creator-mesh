// Minimal YAML serializer for simple objects (no nested arrays in values).
// Used by OPAgent to write exec-plan.yaml without adding a yaml dep.
export function stringify(obj: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === undefined) return "~";
  if (typeof obj === "boolean") return String(obj);
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "string") return obj.includes("\n") ? `|\n${obj.split("\n").map((l) => pad + "  " + l).join("\n")}` : obj;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map((item) => {
        if (Array.isArray(item)) {
          return `${pad}- [${(item as unknown[]).map((v) => String(v)).join(", ")}]`;
        }
        return `${pad}- ${stringify(item, indent + 1)}`;
      })
      .join("\n");
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    return entries
      .map(([k, v]) => {
        if (typeof v === "object" && v !== null && !Array.isArray(v)) {
          return `${pad}${k}:\n${stringify(v, indent + 1)}`;
        }
        if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
          const lines = (v as unknown[][])
            .map((group) => `${pad}  - [${group.map((x) => String(x)).join(", ")}]`)
            .join("\n");
          return `${pad}${k}:\n${lines}`;
        }
        return `${pad}${k}: ${stringify(v, indent + 1)}`;
      })
      .join("\n");
  }
  return String(obj);
}
