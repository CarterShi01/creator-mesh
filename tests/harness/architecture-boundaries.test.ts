import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CORE_DIR = join(ROOT, "src", "core");

const OTHER_SRC_MODULES = [
  "agents", "connectors", "governance", "intake", "knowledge",
  "orchestrator", "outputs", "runners", "shared", "storage",
  "triggers", "workflows",
];

function getCoreFiles(): string[] {
  return readdirSync(CORE_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(CORE_DIR, f));
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

describe("architecture boundaries: src/core", () => {
  const coreFiles = getCoreFiles();

  it("src/core contains TypeScript files to check", () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of coreFiles) {
    const fileName = filePath.split("/").pop()!;

    it(`${fileName} does not import from other src modules`, () => {
      const content = readFileSync(filePath, "utf-8");
      const imports = extractImportPaths(content);

      for (const imp of imports) {
        for (const mod of OTHER_SRC_MODULES) {
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
