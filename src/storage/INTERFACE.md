# Interface: src/storage

## Purpose

`storage` provides persistence abstractions and adapters. It decouples the rest of the system from any specific storage backend, allowing CreatorMesh to persist state, knowledge references, approvals, and workflow progress without binding to one database or file format.

## Public Concepts

- `Repository<T>` — a generic interface for storing and retrieving a specific record type
- `StorageAdapter` — an interface for a specific storage backend implementation
- `PersistenceRecord` — a base type for any record stored through the storage layer
- `StorageBackend` — an enumeration of supported backends (e.g. LocalFile, SQLite, Postgres, VectorDB)
- `QueryFilter` — a structured filter for retrieving records by field values or ranges

## Inputs

Data from any layer that requires persistence:
- `WorkflowRun` state from `src/orchestrator` or `src/workflows`
- `KnowledgeItem` from `src/knowledge`
- `AuditRecord` from `src/governance`
- `ApprovalRequest` and `ApprovalResult` from `src/governance`

## Outputs

Persisted records retrieved by:
- `src/orchestrator` (flow state)
- `src/knowledge` (knowledge items)
- `src/governance` (audit records, approval history)
- `src/workflows` (workflow run history)

## Allowed Dependencies

- `src/core`
- `src/shared`

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge`
- `src/orchestrator`
- `src/agents`
- `src/runners`
- `src/connectors`
- `src/workflows`
- `src/governance`
- `src/outputs`

## Invariants

- `storage` must expose a backend-agnostic interface. No caller should depend on a specific storage implementation.
- Storage adapters must be swappable without changing the calling layer.
- `storage` must not contain business logic, routing decisions, or agent reasoning.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
