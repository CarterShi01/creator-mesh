# Interface: src/intake

## Purpose

`intake` converts raw trigger payloads into normalized internal capture items. It is the bridge between messy real-world input and CreatorMesh's internal models.

## Public Concepts

- `NormalizedInput` — a cleaned and structured representation of a raw trigger payload
- `SourceMetadata` — metadata about the origin of an input (source type, timestamp, language, channel)
- `CaptureItem` — the fully normalized output of the intake process, ready for downstream processing

## Inputs

`TriggerPayload` from `src/triggers`.

## Outputs

`CaptureItem` passed to `src/orchestrator` or `src/knowledge` for further processing.

## Allowed Dependencies

- `src/core`
- `src/shared`

## Disallowed Dependencies

- `src/triggers` (intake does not call back into triggers)
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

- `intake` must not perform deep reasoning, planning, or knowledge structuring.
- `intake` must not write to storage directly.
- `intake` should produce a `CaptureItem` that is consistent regardless of input source.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
