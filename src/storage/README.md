# Storage

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
