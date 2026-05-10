# Interface: src/outputs

## Purpose

`outputs` generates and prepares the final artifacts that CreatorMesh delivers to the creator or writes back to connected tools. It is the last layer before a result reaches its destination.

## Public Concepts

- `OutputArtifact` — a finished result ready for delivery, such as a structured note, plan, report, or mind-map outline
- `FormattedOutput` — an artifact rendered in a specific format (Markdown, JSON, plain text, etc.)
- `WriteBackPayload` — a structured payload prepared for a connector to write to an external tool
- `DeliveryTarget` — a description of where an artifact should go (creator view, Notion page, GitHub issue, etc.)

## Inputs

- `WorkflowOutput` from `src/workflows`
- `KnowledgeItem` from `src/knowledge`
- `AgentOutput` from `src/agents`

## Outputs

- `FormattedOutput` delivered to the creator interface
- `WriteBackPayload` sent to `src/connectors` for write-back to external tools

## Allowed Dependencies

- `src/triggers`
- `src/shared`
- `src/connectors` (for write-back delivery)

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/orchestrator`
- `src/agents`
- `src/runners`
- `src/knowledge`
- `src/workflows`
- `src/governance`
- `src/storage`

## Invariants

- `outputs` must not make routing decisions or trigger new flows. Its job ends when the artifact is prepared or delivered.
- Output formatting must be separable from output delivery. Formatting and connector write-back are distinct concerns.
- `outputs` must not store data. Persistence belongs in `src/storage`.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
