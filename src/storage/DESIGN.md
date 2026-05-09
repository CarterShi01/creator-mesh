# Design: src/storage

## Current Design Summary

`storage` provides backend-agnostic persistence abstractions. Other layers write and read records through `Repository<T>` interfaces without knowing the underlying backend. The design is local-first: the first implementation target is local file or SQLite storage. No implementation files exist yet.

## Design Goals

- Allow the rest of the system to persist state without coupling to any specific database or file format.
- Make storage adapters swappable — switching backends should not require changes in calling layers.
- Support the main persistence needs: workflow state, knowledge items, audit records, approval history.

## Key Decisions

- **`Repository<T>` pattern**: each record type has a repository interface with standard `save`, `findById`, `query`, and `delete` operations. Callers depend on the interface, not on the adapter.
- **Local-first**: the first storage backend will be local (local file JSON or SQLite). Cloud or hosted backends come later.
- **`storage` has zero `src/` dependencies**: to prevent circular imports, storage does not import from knowledge, governance, or any other module. Record types are passed in by callers.
- **`QueryFilter` for structured retrieval**: instead of raw SQL or MongoDB-style queries, callers use a typed `QueryFilter` to keep the interface backend-agnostic.

## Tradeoffs

- A generic `Repository<T>` interface is simple to swap but may not express backend-specific optimizations (e.g., full-text search, vector similarity). Specialized queries will require extensions or a separate query interface.
- Local-first is safe for single-user early development but will need a migration strategy when multi-device or cloud sync is required.

## Alternatives Considered

- **Use Notion as the primary storage backend** — rejected. Notion is a connector (external tool). Internal system state (workflow runs, audit records) should not depend on an external API.
- **Direct SQLite calls without abstraction** — rejected. Would couple all modules to SQLite and make backend switching expensive.

## Current Assumptions

- The first storage backend will be local JSON files or SQLite.
- Record types (WorkflowRun, KnowledgeItem, AuditRecord, ApprovalRequest) are defined in their respective modules, not in `storage`.
- Storage is not responsible for migrations at v1. Schema evolution will be addressed when a second backend is introduced.

## Open Questions

- SQLite or local JSON files for the first backend? SQLite supports queries natively; JSON files are simpler to inspect and debug.
- How are storage errors (write failure, read miss) propagated — as exceptions, `Result<T>`, or explicit error types?
- Is there a need for a transaction model at v1, or can all writes be treated as independent?

## Future Evolution

- Additional backends: Postgres, vector database, Notion-backed records for knowledge items.
- A migration layer will be needed when the schema evolves across backend versions.
- Multi-device sync would require a conflict resolution strategy.

## ChatGPT Handoff Context

`src/storage` has no implementation yet. Design intent: backend-agnostic `Repository<T>` interface. Local-first (JSON or SQLite first backend). Zero `src/` dependencies — record types are passed in by callers. Supports: WorkflowRun state, KnowledgeItem persistence, AuditRecord, ApprovalHistory. Key open question: SQLite vs local JSON for v1. No Notion as backend — Notion is a connector.
