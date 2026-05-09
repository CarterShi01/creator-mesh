import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, ".claude", "skills");
const skillsExist = existsSync(SKILLS_DIR);

describe("skills format", () => {
  if (!skillsExist) {
    it("passes when .claude/skills directory is absent", () => {
      expect(skillsExist).toBe(false);
    });
  } else {
    const skillDirs = readdirSync(SKILLS_DIR).filter((name) =>
      statSync(join(SKILLS_DIR, name)).isDirectory()
    );

    it("skills directory contains at least one skill", () => {
      expect(skillDirs.length).toBeGreaterThan(0);
    });

    for (const skill of skillDirs) {
      it(`skill "${skill}" contains SKILL.md`, () => {
        expect(existsSync(join(SKILLS_DIR, skill, "SKILL.md"))).toBe(true);
      });
    }
  }
});
