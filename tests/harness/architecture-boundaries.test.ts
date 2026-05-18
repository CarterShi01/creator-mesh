import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TRIGGERS_DIR = join(ROOT, "src", "triggers");
const STORAGE_DIR = join(ROOT, "src", "storage");

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

function collectTsFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      result.push(full);
    }
  }
  return result;
}

const SQL_KEYWORDS_RE = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/;

function extractImportPaths(content: string): string[] {
  const results: string[] = [];
  const re = /^(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    results.push(m[1]);
  }
  return results;
}

describe("architecture boundaries: src/storage SQL-confinement invariant", () => {
  const sqliteDir = join(STORAGE_DIR, "sqlite");
  const storageFiles = collectTsFiles(STORAGE_DIR).filter(
    (f) => !f.startsWith(sqliteDir)
  );

  it("src/storage has TypeScript files outside sqlite/ to check", () => {
    expect(storageFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of storageFiles) {
    const relPath = filePath.replace(ROOT + "/", "");

    it(`${relPath} does not contain raw SQL keywords`, () => {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (SQL_KEYWORDS_RE.test(line)) {
          throw new Error(
            `${relPath}:${i + 1} — SQL keyword found outside src/storage/sqlite/: "${line.trim()}"`
          );
        }
      }
    });
  }
});

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
