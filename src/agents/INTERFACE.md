# Interface: src/agents

## Purpose

`agents` defines agent roles and reasoning contracts. An agent is a named role that can reason about a specific domain, task, or decision. Agents do not execute work directly — they reason and return structured outputs.

## Public Concepts

- `AgentRole` — a named reasoning role with a defined domain and capability set
- `AgentInstruction` — the instruction set given to an agent for a specific task
- `AgentCapability` — a declared ability of an agent role
- `AgentInput` — the structured input an agent receives to reason about
- `AgentOutput` — the structured result an agent produces after reasoning

Possible future agent roles:
- `ThoughtAgent`
- `MessageAgent`
- `KnowledgeAgent`
- `PlanningAgent`
- `ResearchAgent`
- `ReviewAgent`
- `GovernanceAgent`

## Inputs

`AgentTask` from `src/orchestrator`, containing the task description, context, and input data.

## Outputs

`AgentOutput` returned to `src/orchestrator` or `src/workflows`, containing the reasoning result, recommendations, or structured decisions.

## Allowed Dependencies

- `src/core`
- `src/shared`

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge` (agents reason about knowledge items but do not manage the knowledge layer)
- `src/runners` (execution is delegated through orchestrator)
- `src/connectors`
- `src/workflows`
- `src/governance`
- `src/storage`
- `src/outputs`

## Invariants

- Agents must not execute code, call external APIs, or write to storage directly.
- Agent roles must remain stateless. State belongs in `src/storage` or `src/orchestrator`.
- Agent instructions must be readable and auditable. Prompt logic should not be hidden in implementation files.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
