import { describe, it, expect } from "vitest";
import { NOTION_CAPABILITIES } from "../../../../../src/capabilities/connectors/notion/capabilities.js";

describe("NOTION_CAPABILITIES", () => {
  it("declares exactly 5 MVP capabilities", () => {
    expect(NOTION_CAPABILITIES).toHaveLength(5);
  });

  it("includes search/page as safe-read with no approval required", () => {
    const cap = NOTION_CAPABILITIES.find((c) => c.id === "notion.search.page");
    expect(cap).toBeDefined();
    expect(cap!.type).toBe("search");
    expect(cap!.resourceType).toBe("page");
    expect(cap!.permissionLevel).toBe("safe-read");
    expect(cap!.approvalRequirement).toBe("never");
    expect(cap!.reversible).toBe(true);
  });

  it("includes create/page as write with conditional approval", () => {
    const cap = NOTION_CAPABILITIES.find((c) => c.id === "notion.create.page");
    expect(cap).toBeDefined();
    expect(cap!.permissionLevel).toBe("write");
    expect(cap!.approvalRequirement).toBe("conditional");
    expect(cap!.reversible).toBe(false);
  });

  it("all capabilities have non-empty description", () => {
    for (const cap of NOTION_CAPABILITIES) {
      expect(cap.description.length).toBeGreaterThan(0);
    }
  });
});
