# Agents

`src/agents` owns role-based execution subjects.

An agent is a higher-level callable entity with a specific responsibility, reasoning style, and capability set. Agents apply knowledge from `src/knowledge`, request tool use through `runtime`, and produce intermediate reasoning or structured output for `workflows`.

## What belongs here

- Agent role definitions and responsibility descriptions
- Agent input and output contracts (`AgentRole`, `AgentInput`, `AgentOutput`)
- Agent reasoning logic and prompt strategy
- Injectable client interfaces for testability (e.g., `ThoughtAgentClient`)
- Agent capability descriptions

## What does not belong here

- The runtime loop — `runtime` owns execution lifecycle, session/context, permission gate, and tool invocation
- Direct ownership of connectors, runners, or provider SDKs — agents request capabilities; they do not implement them
- Hardcoded business workflows — `workflows` owns stable routines
- Governance policy — `governance` owns policy; `runtime` enforces it; agents must not bypass it for external side effects
- Storage implementations or external message transport

## What agents are NOT

- Not the runtime execution loop — `runtime` owns execution lifecycle, session/context, pause/resume, and permission gates
- Not direct owners of connectors or runners — agents request physical capabilities through runtime boundaries
- Not hardcoded per-tool business workflows
- Not allowed to bypass governance for external side effects

## Current implementation

`ThoughtAgent` is the first implemented reasoning role. It is an MVP agent that classifies a thought into a structured `ThoughtClassification` (category, summary, tags, confidence, suggestedTitle). It uses an injectable `ThoughtAgentClient` backed by `AnthropicThoughtClient` in production and a mock in tests.

`ThoughtAgent` should be read as the first agent implementation demonstrating the `AgentRole` interface — not as the final agent taxonomy or the template for every future agent design.

## Future agents

The agent layer is expected to grow into a mesh of specialised roles over time. Examples:

- Message Agent
- Knowledge Agent
- Life Planning Agent
- Career Agent
- Startup Agent
- Research Agent
- Engineering Agent
- Review Agent
- Governance Agent

Each agent should have a focused responsibility and should apply relevant knowledge assets from `src/knowledge` rather than encoding domain reasoning from scratch.

## Role in the architecture

`agents` sits alongside `knowledge` and `workflows` in the layer below `runtime`, above `runners`, `connectors`, `governance`, and `storage`.

- `runtime` dispatches agent steps, enforces governance, and manages execution lifecycle.
- `agents` perform domain reasoning: interpret context, apply knowledge, and return structured output.
- `runners` and `connectors` provide physical execution capabilities that agents may request through runtime.

Agents are execution subjects — not the system brain, not the runtime engine, and not the worldview layer.
