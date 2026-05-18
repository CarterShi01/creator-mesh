# Storage

> **Status: Phase 1.5 implemented (SQLite)**
> Four stores (`WorkflowDefinitionStore`, `WorkflowRunStore`, `ManagedProjectStore`, `RelationStore`) backed by SQLite (better-sqlite3). `runs.jsonl` / `plans/index.jsonl` remain the Phase 1 write-path during the bridge period; use the importer to sync into SQLite for reads.
> When naming new Phase 1 constructs that relate to this module's concepts, use [convergence.md](../../docs/control-plane/convergence.md) to find the aligned name.

The `storage` directory contains persistence abstractions and storage adapters.

CreatorMesh may start local-first, but it should be able to support different storage backends over time.

Possible future storage backends may include:

- Local files
- SQLite
- Postgres
- Notion-backed records
- Vector databases

## What belongs here

- Storage interfaces
- Repository patterns
- Persistence adapters
- Data access boundaries
- State persistence for workflow runs, approvals, and agent runs

## What does not belong here

- Core domain definitions
- Agent prompts
- Workflow decisions
- External service business logic
- Output formatting

## Role in the architecture

`storage` persists CreatorMesh state, knowledge references, agent runs, approvals, and workflow progress.

It should provide persistence without forcing the rest of the system to depend on one storage backend.
