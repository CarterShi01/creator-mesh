import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TRIGGERS_DIR = join(ROOT, "src", "triggers");

// Modules that src/triggers must not import from (higher-level layers)
const HIGHER_LEVEL_MODULES = [
  "creation", "knowledge", "runtime", "agents", "capabilities",
  "workflows", "governance", "storage", "outputs",
];

function getTriggersFiles(): string[] {
  return readdirSync(TRIGGERS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(TRIGGERS_DIR, f));
}

function extractImportPaths(content: string): string[] {
  const results: string[] = [];
  const re = /^(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    results.push(m[1]);
  }
  return results;
}

describe("architecture boundaries: src/triggers input-boundary invariant", () => {
  const triggersFiles = getTriggersFiles();

  it("src/triggers contains TypeScript files to check", () => {
    expect(triggersFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of triggersFiles) {
    const fileName = filePath.split("/").pop()!;

    it(`${fileName} does not import from higher-level src modules`, () => {
      const content = readFileSync(filePath, "utf-8");
      const imports = extractImportPaths(content);

      for (const imp of imports) {
        for (const mod of HIGHER_LEVEL_MODULES) {
          const forbidden =
            imp === `../${mod}` ||
            imp.startsWith(`../${mod}/`);
          expect(
            forbidden,
            `${fileName} must not import from src/${mod} — found import "${imp}"`
          ).toBe(false);
        }
      }
    });
  }
});
