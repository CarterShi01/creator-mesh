# CreatorMesh Context Map

This is the compact source map for AI coding agents working in this project.

## Required Reading Order

Before reading any implementation file, read in this order:

1. `AGENTS.md`
2. `docs/context-map.md` — this file
3. `docs/architecture.md`
4. Target directory `README.md`
5. Target directory `DESIGN.md` — if it exists
6. Target directory `INTERFACE.md` — if it exists
7. Only then: specific implementation files needed for the task

## Client Layer

| Directory | Purpose |
|-----------|---------|
| `clients/creator-console` | Phase 4 Governed Runtime Bridge — isolated Vite + React + TypeScript PWA client; WorkflowClient abstraction + RunLedger; mock-only runtime; zero src/ import; read DESIGN.md before working here |

## Source Map

| Directory | Purpose |
|-----------|---------|
| `src/core` | Stable domain primitives and internal concepts |
| `src/triggers` | Input signals that start flows |
| `src/intake` | Normalization of raw inputs |
| `src/creation` | Long-running creation domain state (LongArc, CreationAsset, DecisionRecord, ArtifactRef, ProgressSnapshot, ContextBrief) |
| `src/knowledge` | Structured knowledge assets |
| `src/orchestrator` | Flow coordination and routing |
| `src/agents` | Agent roles and reasoning contracts |
| `src/runners` | Execution engines and runner adapters |
| `src/connectors` | External tool integrations |
| `src/workflows` | End-to-end input-to-output transformations |
| `src/governance` | Approval, audit, permission, and safety policies |
| `src/storage` | Persistence abstractions and adapters |
| `src/outputs` | Output artifacts and write-back preparation |
| `src/shared` | Small reusable utilities |

## When to read creation docs

Read `src/creation/` docs before `src/knowledge/` or `src/workflows/` when working on:

- `LongArc` or long-running domain state
- `CreationAsset`, `DecisionRecord`, `ArtifactRef`
- `ProgressSnapshot` or `ContextBrief`
- any flow that tracks what a unit of work is (not how it is executed)
- long-running continuity across many workflow runs or tool interactions

## Cost Rule

Do not read implementation files until the relevant interface document has been read.

If `INTERFACE.md` exists in the target directory, read it before opening any source file.

## Change Rule

When a module's public concepts, inputs, outputs, dependencies, or invariants change, update its `INTERFACE.md`.

The context map and interface documents are the source of truth for agents. Keep them current.
