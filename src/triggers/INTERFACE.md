# Interface: src/triggers

## Purpose

`triggers` defines the input entry points of CreatorMesh. It represents the initial signal that something should happen — a thought captured, a message received, a schedule fired, or a system event raised.

## Public Concepts

- `ThoughtTrigger` — a creator-initiated signal carrying a thought, idea, note, or reflection
- `MessageTrigger` — an externally received signal carrying a message, request, or opportunity
- `ScheduledTrigger` — a time-based signal such as a daily review or weekly planning prompt
- `SystemEventTrigger` — a signal raised by a tool or workflow state change
- `TriggerPayload` — a normalized envelope wrapping any trigger type for handoff to intake

## Inputs

Raw signals from the outside world or from the creator:
- Manual thought or note entry
- Incoming messages from external sources
- Scheduled jobs
- System or tool state events

## Outputs

`TriggerPayload` passed to `src/intake` for normalization.

## Allowed Dependencies

- `src/core`
- `src/shared`

## Disallowed Dependencies

- `src/intake`
- `src/knowledge`
- `src/orchestrator`
- `src/agents`
- `src/runners`
- `src/connectors`
- `src/workflows`
- `src/governance`
- `src/storage`
- `src/outputs`

## Invariants

- `triggers` must not perform normalization, reasoning, or storage. Its only job is to represent and forward the initial signal.
- `triggers` must not call downstream layers directly. It hands off to `intake`.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
