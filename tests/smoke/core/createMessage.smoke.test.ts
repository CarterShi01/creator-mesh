import { describe, it, expect } from "vitest";
import { createMessage } from "../../../src/core/index.js";

describe("createMessage", () => {
  it("returns a Message with id, content, createdAt, and source", () => {
    const message = createMessage("a client request");
    expect(message.id).toBeTypeOf("string");
    expect(message.id.length).toBeGreaterThan(0);
    expect(message.content).toBe("a client request");
    expect(message.createdAt).toBeInstanceOf(Date);
    expect(message.source).toBe("manual");
  });

  it("trims content", () => {
    const message = createMessage("  padded content  ");
    expect(message.content).toBe("padded content");
  });

  it("defaults source to manual", () => {
    const message = createMessage("a message");
    expect(message.source).toBe("manual");
  });

  it("rejects empty content", () => {
    expect(() => createMessage("")).toThrow("Message content must not be empty.");
  });

  it("rejects whitespace-only content", () => {
    expect(() => createMessage("   ")).toThrow("Message content must not be empty.");
  });
});
