import { describe, it, expect } from "vitest";
import { createThought } from "../../../src/core/index.js";

describe("createThought", () => {
  it("returns a Thought with id, content, createdAt, and source", () => {
    const thought = createThought("an interesting idea");
    expect(thought.id).toBeTypeOf("string");
    expect(thought.id.length).toBeGreaterThan(0);
    expect(thought.content).toBe("an interesting idea");
    expect(thought.createdAt).toBeInstanceOf(Date);
    expect(thought.source).toBe("manual");
  });

  it("trims content", () => {
    const thought = createThought("  padded content  ");
    expect(thought.content).toBe("padded content");
  });

  it("defaults source to manual", () => {
    const thought = createThought("a thought");
    expect(thought.source).toBe("manual");
  });

  it("rejects empty content", () => {
    expect(() => createThought("")).toThrow("Thought content must not be empty.");
  });

  it("rejects whitespace-only content", () => {
    expect(() => createThought("   ")).toThrow(
      "Thought content must not be empty."
    );
  });
});
