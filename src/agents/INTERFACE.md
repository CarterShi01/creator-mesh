# Interface: src/agents

## Purpose

`agents` defines stateless reasoning roles. An agent receives structured input, reasons about it using role-specific instructions, and returns structured output. Agents do not execute code, call connectors, or write to storage.

## Public Concepts

### AgentRole

```
AgentRole {
  agentId: string
  execute(input: AgentInput): Promise<AgentOutput>
}
```

### AgentInput / AgentOutput

```
AgentInput {
  agentRole: string
  task: string
  context?: Record<string, unknown>
}

AgentOutput {
  agentRole: string
  result: unknown        // role-specific structured output
  metadata?: Record<string, unknown>
}
```

### ThoughtAgent

Implements `AgentRole`. Accepts an injectable `ThoughtAgentClient` for testability.
`agentId = "thought-agent"`.

Input: `context.thought` (string) — the raw thought to classify.
Falls back to `input.task` when `context.thought` is absent.

Result type: `ThoughtClassification`.

```
ThoughtAgent implements AgentRole {
  agentId: "thought-agent"
  constructor(client: ThoughtAgentClient)
  execute(input: AgentInput): Promise<AgentOutput>   // result: ThoughtClassification
}
```

### ThoughtClassification

```
ThoughtClassification {
  category: string          // "idea" | "task" | "question" | "reference" | "reminder" | "observation"
  summary: string           // 1-2 sentence summary
  tags: string[]            // 1-5 lowercase tags
  confidence: number        // 0-1
  suggestedTitle: string    // short page title for Notion (under 80 chars)
}
```

### ThoughtAgentClient

Injectable interface for the LLM backing. Used to make ThoughtAgent testable without calling the real Claude API.

```
ThoughtAgentClient {
  complete(system: string, user: string): Promise<string>
}
```

### AnthropicThoughtClient

Concrete implementation of `ThoughtAgentClient` backed by the Anthropic Messages API.
Model: `claude-haiku-4-5-20251001`.

```
AnthropicThoughtClient implements ThoughtAgentClient {
  constructor(apiKey?: string)
  complete(system: string, user: string): Promise<string>
}
```

## Allowed Dependencies

- `src/triggers`
- `src/shared`
- `@anthropic-ai/sdk` (ThoughtAgent backing only — via dynamic import in AnthropicThoughtClient)

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge`
- `src/runners`
- `src/connectors`
- `src/workflows`
- `src/governance`
- `src/storage`
- `src/outputs`
- `src/orchestrator`

## Invariants

- Agents must remain stateless. No shared state between `execute()` calls.
- Agent instructions (system prompts) must be readable strings in source — not hidden in configuration.
- `AgentOutput.result` must always be a serializable value (JSON-compatible).
- `ThoughtAgent` never throws for well-formed input — parse errors from LLM responses are surfaced as thrown errors with descriptive messages.

## Main Files

- `port.ts` — `AgentRole`, `AgentInput`, `AgentOutput` interfaces
- `thought-agent.ts` — `ThoughtAgent`, `ThoughtClassification`, `ThoughtAgentClient`, `AnthropicThoughtClient`
- `index.ts` — barrel re-exports

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
5. Update this file if the public contract changes.
6. Apply bottom-up propagation: if `AgentRole` or `AgentInput`/`AgentOutput` change, update `src/orchestrator/INTERFACE.md`.
