import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const srcModules = readdirSync(join(ROOT, "src")).filter((name) =>
  statSync(join(ROOT, "src", name)).isDirectory()
);

describe("docs presence: root files", () => {
  it("CLAUDE.md exists", () => {
    expect(existsSync(join(ROOT, "CLAUDE.md"))).toBe(true);
  });

  it("docs/blueprint.md exists", () => {
    expect(existsSync(join(ROOT, "docs", "blueprint.md"))).toBe(true);
  });

  it("README.md exists", () => {
    expect(existsSync(join(ROOT, "README.md"))).toBe(true);
  });

  it("docs/architecture.md exists", () => {
    expect(existsSync(join(ROOT, "docs", "architecture.md"))).toBe(true);
  });

  it("docs/context-map.md exists", () => {
    expect(existsSync(join(ROOT, "docs", "context-map.md"))).toBe(true);
  });
});

describe("docs presence: src module documentation", () => {
  for (const mod of srcModules) {
    it(`src/${mod} has README.md`, () => {
      expect(existsSync(join(ROOT, "src", mod, "README.md"))).toBe(true);
    });
  }
});
