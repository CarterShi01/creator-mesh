# Interface: src/shared

## Purpose

`shared` provides small, generic utilities used across multiple layers. It should remain minimal and free of business logic.

## Public Concepts

- `Logger` — a structured logging utility
- `AppError` — a base error type with code, message, and optional context
- `Result<T>` — a lightweight result type representing success or failure without throwing
- `ConfigHelper` — utilities for reading and validating configuration values
- `DateUtils` — small date and time formatting helpers

## Inputs

None. `shared` is a utility layer. It does not receive inputs from other CreatorMesh modules.

## Outputs

Utilities available to all other `src/` directories.

## Allowed Dependencies

None. `shared` must not depend on any other `src/` directory.

External utility libraries may be used in `shared` only with approval and only for clearly generic purposes (e.g. date formatting, UUID generation).

## Disallowed Dependencies

All other `src/` directories.

## Invariants

- `shared` must not contain business logic, domain types, agent prompts, or workflow-specific code.
- `shared` must not grow into a general dumping ground. If a utility is specific to one module, it belongs in that module.
- Functions in `shared` should be pure or have minimal, well-understood side effects.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
