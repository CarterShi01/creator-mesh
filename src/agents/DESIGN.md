# Design: src/agents

## Current Design Summary

`agents` defines stateless reasoning roles. An agent receives an `AgentTask`, reasons about it using its role-specific instructions and context, and returns an `AgentOutput`. Agents do not execute code, call external APIs, or write to storage. No implementation files exist yet.

## Design Goals

- Define a common `AgentRole` interface so reasoning roles are composable and interchangeable.
- Keep agents stateless — state lives in `storage` and context is passed in via `AgentTask`.
- Allow role-specific instructions (system prompts, capability declarations) to be readable and auditable.

## Key Decisions

- **Agents reason, runners execute**. An agent produces a recommendation or structured decision; a runner carries it out. This separation prevents agents from accumulating tool-specific logic.
- **Stateless by design**. No agent holds memory across tasks. All relevant context must be passed in via `AgentInput`. Long-term memory is the orchestrator's and storage's responsibility.
- **Instructions are readable artifacts**. Agent instructions (system prompts, capability descriptions) should be inspectable files or data structures, not buried in implementation code.

## Tradeoffs

- Stateless agents require the orchestrator or workflow to assemble and pass all relevant context on each call. This is more verbose but makes agent behavior fully predictable and auditable.
- A strict "agents do not call external APIs" rule means agents cannot do real-time lookup. Retrieval must be done before the agent is called and passed as context. This keeps agent reasoning pure but adds complexity to workflow orchestration.

## Alternatives Considered

- **Stateful agents with built-in memory** — rejected. Stateful agents are harder to audit, test, and replace. Memory belongs in storage, assembled by the orchestrator.
- **Agents calling connectors directly** — rejected. External API calls in agents would couple reasoning roles to tool-specific implementations. Connectors belong in runners or are pre-fetched before agent invocation.

## Current Assumptions

- The first agent to design will be a `ThoughtAgent` — reasons about a `StructuredThought` and returns a classification or suggested knowledge action.
- Claude (via Claude API or Claude Code) is the first planned LLM backing for agent reasoning.
- Agent instructions will be defined as text in the module, not as external configuration at launch.

## Open Questions

- Should agent roles be defined as TypeScript objects, as markdown prompt files, or both? A hybrid (typed metadata + markdown instruction file) may work best.
- How does the orchestrator decide which agent role to invoke for a given `CaptureItem`? Is this a routing table, a classifier agent, or a fixed dispatch rule?
- How is agent reasoning cost tracked and capped? Should governance set per-agent token limits?

## Future Evolution

- Agent roles will expand as workflows are designed: MessageAgent, KnowledgeAgent, PlanningAgent, ResearchAgent, ReviewAgent, GovernanceAgent.
- An agent mesh or tree may emerge where agents coordinate with each other through the orchestrator.
- Agent instructions may eventually be versioned and swappable without code changes.

## ChatGPT Handoff Context

`src/agents` has no implementation yet. Design intent: stateless reasoning roles. Each role receives `AgentTask` (from orchestrator), reasons using role-specific instructions, returns `AgentOutput`. No external API calls, no storage writes, no runner invocation inside agents. First implementation target: `ThoughtAgent`. Key constraint: agent instructions must be readable and auditable as files or structured data.
