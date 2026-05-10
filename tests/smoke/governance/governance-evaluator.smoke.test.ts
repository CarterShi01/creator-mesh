import { describe, it, expect } from "vitest";
import { GovernanceEvaluator } from "../../../src/governance/index.js";

const evaluator = new GovernanceEvaluator();

describe("GovernanceEvaluator — safe-read", () => {
  it("auto-approves safe-read regardless of prior human review", () => {
    expect(evaluator.evaluate("safe-read", false).decision).toBe("auto-approved");
    expect(evaluator.evaluate("safe-read", true).decision).toBe("auto-approved");
  });
});

describe("GovernanceEvaluator — destructive", () => {
  it("denies destructive operations with no prior human review", () => {
    const result = evaluator.evaluate("destructive", false);
    expect(result.decision).toBe("denied");
  });

  it("denies destructive even when a prior human-review step accepted", () => {
    const result = evaluator.evaluate("destructive", true);
    expect(result.decision).toBe("denied");
  });
});

describe("GovernanceEvaluator — write", () => {
  it("requires-approval when no prior human review", () => {
    const result = evaluator.evaluate("write", false);
    expect(result.decision).toBe("requires-approval");
    expect(result.reason).toContain("write");
  });

  it("auto-approves when prior human review accepted", () => {
    const result = evaluator.evaluate("write", true);
    expect(result.decision).toBe("auto-approved");
  });
});

describe("GovernanceEvaluator — external-side-effect", () => {
  it("requires-approval when no prior human review", () => {
    const result = evaluator.evaluate("external-side-effect", false);
    expect(result.decision).toBe("requires-approval");
  });

  it("auto-approves when prior human review accepted", () => {
    const result = evaluator.evaluate("external-side-effect", true);
    expect(result.decision).toBe("auto-approved");
  });
});

describe("GovernanceEvaluator — execute", () => {
  it("requires-approval when no prior human review", () => {
    const result = evaluator.evaluate("execute", false);
    expect(result.decision).toBe("requires-approval");
  });

  it("auto-approves when prior human review accepted", () => {
    const result = evaluator.evaluate("execute", true);
    expect(result.decision).toBe("auto-approved");
  });
});

describe("GovernanceEvaluator — human", () => {
  it("auto-approves human runner steps", () => {
    expect(evaluator.evaluate("human", false).decision).toBe("auto-approved");
  });
});
