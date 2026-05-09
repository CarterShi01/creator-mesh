import { describe, it, expect, vi } from "vitest";
import { ThoughtAgent } from "../../../src/agents/thought-agent.js";
import type { ThoughtAgentClient, ThoughtClassification } from "../../../src/agents/thought-agent.js";

const VALID_CLASSIFICATION: ThoughtClassification = {
  category: "idea",
  summary: "A thought about distributed systems observability.",
  tags: ["distributed-systems", "observability", "engineering"],
  confidence: 0.92,
  suggestedTitle: "Distributed Systems Need Better Observability Primitives",
};

function makeMockClient(response: unknown = VALID_CLASSIFICATION): ThoughtAgentClient {
  return {
    complete: vi.fn().mockResolvedValue(JSON.stringify(response)),
  };
}

describe("ThoughtAgent", () => {
  it("agentId is thought-agent", () => {
    const agent = new ThoughtAgent(makeMockClient());
    expect(agent.agentId).toBe("thought-agent");
  });

  it("returns AgentOutput with ThoughtClassification result", async () => {
    const agent = new ThoughtAgent(makeMockClient());
    const output = await agent.execute({
      agentRole: "thought-agent",
      task: "Classify this thought",
      context: { thought: "Distributed systems need better observability primitives" },
    });
    expect(output.agentRole).toBe("thought-agent");
    const result = output.result as ThoughtClassification;
    expect(result.category).toBe("idea");
    expect(result.summary).toBeTruthy();
    expect(Array.isArray(result.tags)).toBe(true);
    expect(typeof result.confidence).toBe("number");
    expect(result.suggestedTitle).toBeTruthy();
  });

  it("uses context.thought when available", async () => {
    const client = makeMockClient();
    const agent = new ThoughtAgent(client);
    await agent.execute({
      agentRole: "thought-agent",
      task: "fallback task text",
      context: { thought: "the actual thought content" },
    });
    const [, user] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(user).toBe("the actual thought content");
  });

  it("falls back to task description when context.thought is absent", async () => {
    const client = makeMockClient();
    const agent = new ThoughtAgent(client);
    await agent.execute({
      agentRole: "thought-agent",
      task: "fallback task text",
    });
    const [, user] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(user).toBe("fallback task text");
  });

  it("passes a system prompt to the client", async () => {
    const client = makeMockClient();
    const agent = new ThoughtAgent(client);
    await agent.execute({
      agentRole: "thought-agent",
      task: "some thought",
      context: { thought: "some thought" },
    });
    const [system] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof system).toBe("string");
    expect(system.length).toBeGreaterThan(10);
  });

  it("throws a descriptive error when response is not valid JSON", async () => {
    const client: ThoughtAgentClient = {
      complete: vi.fn().mockResolvedValue("not json at all"),
    };
    const agent = new ThoughtAgent(client);
    await expect(
      agent.execute({ agentRole: "thought-agent", task: "a thought" })
    ).rejects.toThrow("ThoughtAgent: failed to parse classification JSON");
  });

  it("throws when required fields are missing from JSON", async () => {
    const client: ThoughtAgentClient = {
      complete: vi.fn().mockResolvedValue(JSON.stringify({ category: "idea" })),
    };
    const agent = new ThoughtAgent(client);
    await expect(
      agent.execute({ agentRole: "thought-agent", task: "a thought" })
    ).rejects.toThrow("ThoughtAgent: classification response missing required fields");
  });

  it("classification has confidence between 0 and 1", async () => {
    const agent = new ThoughtAgent(makeMockClient());
    const output = await agent.execute({
      agentRole: "thought-agent",
      task: "a thought",
      context: { thought: "Event sourcing enables temporal queries" },
    });
    const result = output.result as ThoughtClassification;
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("classification tags is an array of strings", async () => {
    const agent = new ThoughtAgent(makeMockClient());
    const output = await agent.execute({
      agentRole: "thought-agent",
      task: "a thought",
    });
    const result = output.result as ThoughtClassification;
    expect(Array.isArray(result.tags)).toBe(true);
    result.tags.forEach((tag) => expect(typeof tag).toBe("string"));
  });
});
