# Interface: src/knowledge

## Purpose

`knowledge` manages the structured knowledge layer of CreatorMesh. It turns captured inputs into reusable personal knowledge assets — thoughts, notes, ideas, plans, and relationships between them.

## Public Concepts

- `StructuredThought` — a processed and titled representation of a raw thought
- `Note` — a knowledge item with content, tags, and optional links to other items
- `Idea` — a knowledge item representing a creative direction or product concept
- `Plan` — a knowledge item representing an intention with steps or milestones
- `KnowledgeRelationship` — a typed link between two knowledge items
- `KnowledgeTree` — a hierarchical structure of related knowledge items
- `ReflectionSummary` — a synthesis of multiple knowledge items for review

## Inputs

`CaptureItem` from `src/intake`, passed through `src/orchestrator` or directly from a workflow.

## Outputs

`KnowledgeItem` (and its subtypes) provided to:
- `src/orchestrator` for routing decisions
- `src/workflows` for use in end-to-end flows
- `src/outputs` for artifact generation

## Allowed Dependencies

- `src/core`
- `src/shared`
- `src/storage` (for persistence of knowledge items)

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/orchestrator`
- `src/agents`
- `src/runners`
- `src/connectors` (tool-specific calls belong in connectors, not knowledge)
- `src/workflows`
- `src/governance`
- `src/outputs`

## Invariants

- `knowledge` must remain tool-agnostic. It must not contain Notion, XMind, or other tool-specific logic.
- `knowledge` must not perform agent reasoning or prompt execution directly.
- Knowledge items must be expressible independently of any connected external tool.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
