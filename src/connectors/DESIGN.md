# Design: src/connectors

## Current Design Summary

`src/connectors` is the external system boundary of CreatorMesh. All external tool integrations pass through this layer via **ConnectorPort** — a normalized capability interface that decouples the rest of the system from provider-specific APIs.

The connector model has three core components:

1. **ConnectorPort** — the standard interface every connector adapter must implement
2. **CapabilityRegistry** — declares which capabilities a connector supports, at what permission level, and under what approval conditions
3. **ConnectorAction** — the structured record of every connector operation, which flows into the audit trail via `src/governance`

Notion is the first reference connector. Its implementation will validate ConnectorPort before any other connector is designed or built.

No implementation files exist yet.

## Design Goals

- Decouple the rest of the system from provider-specific APIs. Internal layers depend on normalized capabilities, not Notion SDK methods.
- Make connectors interchangeable. Swapping Notion for another knowledge tool should not require changes in orchestrator, workflows, or knowledge.
- Make every external side effect visible, approvable, and auditable by default.
- Support multiple connector backend types without changing the port interface.

## What a Connector Is

In CreatorMesh's model, a connector is an **external system boundary adapter**.

It is not a knowledge model. It is not an agent. It is not a workflow.

A connector:

- Declares which capabilities it supports via `CapabilityRegistry`
- Receives a `ConnectorAction` from the caller (orchestrator or workflow)
- Executes the action against the external system
- Returns a `ConnectorResult`
- Produces an audit record for every action, regardless of success or failure

A connector does not decide what to do — that is the orchestrator's job. It only executes what it is asked to do, within its declared capabilities.

## ConnectorPort

`ConnectorPort` is the standard interface that every connector adapter must implement.

```
ConnectorPort {
  connectorId: string
  capabilities(): CapabilityRegistry
  execute(action: ConnectorAction): Promise<ConnectorResult>
}
```

`connectorId` identifies the connector (e.g. `"notion"`, `"github"`, `"filesystem"`).

`capabilities()` returns the connector's declared capability registry. The caller uses this to check whether the connector supports a given operation before issuing a `ConnectorAction`.

`execute()` is the single entry point for all connector operations. The connector interprets the `ConnectorAction` (including its capability type and resource type) and performs the corresponding provider-specific API call.

All callers (orchestrator, workflows, outputs) interact with `ConnectorPort`, never with a specific adapter class or SDK.

## CapabilityRegistry

Each connector declares its capabilities at initialization time. The registry answers two questions:

- Does this connector support this capability type?
- What are the permission level and approval rules for this capability?

A `Capability` has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique capability identifier within this connector |
| `type` | CapabilityType | One of the standard capability types |
| `resourceType` | string | The kind of resource this applies to (e.g. `"page"`, `"database"`, `"block"`) |
| `permissionLevel` | PermissionLevel | The risk classification of this capability |
| `approvalRequirement` | ApprovalRequirement | When human approval is required |
| `reversible` | boolean | Whether the operation can be undone |
| `description` | string | Human-readable description for audit and review display |

## Standard Capability Types

CreatorMesh defines nine standard capability types. Every connector maps its provider-specific operations onto these types.

| Type | Meaning | Default permission | Default approval |
|------|---------|-------------------|-----------------|
| `read` | Read a specific resource by ID or reference | `safe-read` | `never` |
| `search` | Query or list resources | `safe-read` | `never` |
| `create` | Create a new resource | `write` | `conditional` |
| `update` | Modify an existing resource's properties | `write` | `conditional` |
| `append` | Add content to an existing resource without replacing it | `write` | `conditional` |
| `delete` | Remove or archive a resource | `destructive` | `always` |
| `sync` | Synchronize state between internal and external | `external-side-effect` | `always` |
| `subscribe` | Register for events or webhooks | `external-side-effect` | `conditional` |
| `execute` | Run a command, script, or operation in the external system | `external-side-effect` | `always` |

"Default" means the baseline before context or governance policy adjusts it. Governance may elevate or relax defaults based on configured policies.

## Permission Levels

Permission levels classify the risk and reversibility of a capability.

| Level | Meaning | Auto-approved? |
|-------|---------|---------------|
| `safe-read` | Read-only, no side effects on external system | Yes |
| `write` | Creates or modifies data; generally reversible | Conditional |
| `destructive` | Deletes, archives, or irreversibly changes data | Never — always requires explicit approval |
| `external-side-effect` | Any action visible to other users or external systems beyond read | Never — always requires explicit approval |

## Approval Requirements

Each capability declares when human approval is required:

| Requirement | Meaning |
|-------------|---------|
| `never` | Auto-approved; no human intervention needed |
| `conditional` | Approval required when the action affects a large scope, sensitive resource, or is flagged by governance policy |
| `always` | Every invocation requires explicit creator approval before execution |

The orchestrator checks the capability's `approvalRequirement` before issuing a `ConnectorAction`. If approval is required, it requests an `ApprovalResult` from `src/governance` before calling `ConnectorPort.execute()`.

## ConnectorAction and Audit Trail

Every call to `ConnectorPort.execute()` is represented as a `ConnectorAction`. The action record:

- Identifies the connector and capability
- Describes the resource type and ID (if known)
- Carries a human-readable payload summary (not raw secrets or full data blobs)
- Records the approval result before execution
- Records the final status (completed, failed, rejected)

After execution, the connector returns a `ConnectorResult` that includes an `auditId`. This ID links the result back to the `AuditRecord` that `src/governance` persists via `src/storage`.

The audit trail is append-only. Every connector action — including rejected, failed, and auto-approved actions — has a record.

## Connector Backend Types

A `ConnectorPort` adapter may be backed by one of three backend types:

1. **Direct API adapter** — thin wrapper over a provider SDK (e.g. Notion SDK, GitHub REST API). Used for Notion at v1.
2. **MCP-compatible adapter** — wraps an MCP server that exposes the external tool as a set of tools. Allows reuse of community MCP connectors without hand-writing SDK integrations.
3. **Integration hub adapter** — wraps an external automation backend (e.g. n8n, Zapier, Pipedream) as an optional provider. Used for long-tail integrations where maintaining a direct adapter is too costly.

All three backend types implement the same `ConnectorPort` interface. The caller cannot tell which backend type is in use.

## Notion Capability Mapping (Reference)

This section documents how Notion operations map onto the standard capability model. It is a design reference, not an implementation contract.

| Notion Operation | Capability Type | Resource Type | Permission | Approval |
|-----------------|----------------|---------------|------------|----------|
| Search pages | `search` | `page` | `safe-read` | `never` |
| Read page metadata | `read` | `page` | `safe-read` | `never` |
| Read page blocks | `read` | `block` | `safe-read` | `never` |
| Read database metadata | `read` | `database` | `safe-read` | `never` |
| Create page | `create` | `page` | `write` | `conditional` |
| Append blocks to page | `append` | `block` | `write` | `conditional` |
| Update page properties | `update` | `page` | `write` | `conditional` |
| Archive page | `delete` | `page` | `destructive` | `always` |
| Manual sync (push internal → Notion) | `sync` | `page` | `external-side-effect` | `always` |
| Webhook subscription (deferred) | `subscribe` | `page` | `external-side-effect` | `conditional` |

Notion MVP scope (phase 1): `search`, `read` (page + block), `create`, `append`.
Deferred: `update`, `delete`, `sync`, `subscribe`.

Destructive and sync operations must not be performed without explicit creator approval.

## Key Decisions

- **ConnectorPort is the only interface callers depend on.** No caller in orchestrator, workflows, or outputs should import a specific connector adapter class.
- **Capabilities are declared, not discovered at runtime.** The registry is built when the connector is initialized, not inferred from API responses.
- **Every action is audited, including auto-approved and failed ones.** An empty audit trail is not acceptable.
- **Notion is a reference connector, not the port design center.** The capability model was designed for all connectors; Notion happens to be the first example.
- **The port does not own approval decisions.** The orchestrator requests approval from governance before calling `execute()`. The port only records the approval result.

## Tradeoffs

- A single `execute(ConnectorAction)` entry point is simple and uniform but requires the connector to do internal dispatch based on `capability.type`. Each connector will have conditional logic. This is preferable to a multi-method interface that leaks capability types into the port signature.
- Declaring capabilities at initialization means the registry cannot dynamically reflect per-resource permissions (e.g. a page the creator cannot edit). Runtime permission errors are handled as `ConnectorResult` failures, not as registry mismatches.
- Keeping `ConnectorAction.payloadSummary` as a human-readable string (not the full payload) limits audit record size but means the full operation data is not stored in the audit log. This is intentional — the audit log is for accountability, not data recovery.

## Alternatives Considered

- **Multi-method ConnectorPort (separate `read()`, `create()`, `delete()` methods)** — rejected. Would add methods every time a new capability type is introduced. Single `execute()` with typed actions is more extensible.
- **Capabilities discovered from provider API** — rejected. Notion's API does not reliably express permission state in advance. Explicit capability declaration makes behavior predictable and testable.
- **Approval handled inside the connector** — rejected. Governance decisions must be centralized. The connector only records what the orchestrator decided; it does not prompt the creator.

## Current Assumptions

- The Notion connector will use the official Notion SDK as its Direct API adapter backend.
- All connector adapters are initialized with a `ConnectorConfig` (credentials, base URL, etc.) injected at startup — no hardcoded credentials.
- The first `ConnectorAction` will be a `search` or `read` operation against Notion (read-only, safe-read level).
- The `auditId` in `ConnectorResult` is a UUID generated by `src/governance` when the `AuditRecord` is persisted.

## Open Questions

- **Pagination**: how does `read` or `search` return paginated results? Does `ConnectorResult.data` carry a cursor, or does the connector handle pagination internally and return a complete collection?
- **Streaming results**: for large Notion databases, does the connector stream results or batch them? This affects the `ConnectorResult` shape.
- **Connector initialization lifecycle**: when are connectors instantiated — once at process start, once per request, or lazily? This affects how `ConnectorConfig` is injected and how credentials are refreshed.
- **MCP adapter**: when is the first MCP-compatible adapter worth building? Not before at least two direct adapters exist and a common pattern is proven.
- **Error taxonomy**: `ConnectorResult` currently uses a free-form `error` string. Should it carry a structured `ConnectorErrorCode` so orchestrator and governance can react to specific failure modes (auth failure, rate limit, not-found, etc.)?

## Future Evolution

- As more connectors are added (GitHub, email, Slack), the CapabilityRegistry becomes a stable registry lookup — the orchestrator selects a connector by querying which connectors support a given capability for a given resource type.
- MCP-compatible adapters will reduce the cost of supporting long-tail integrations.
- Governance policies may evolve to allow per-connector, per-resource-type approval rules rather than capability-type defaults.

## ChatGPT Handoff Context

`src/connectors` has no implementation yet. The design defines:
- `ConnectorPort` — single `execute(ConnectorAction): Promise<ConnectorResult>` entry point
- `CapabilityRegistry` — declared at init time; nine standard capability types (read/search/create/update/append/delete/sync/subscribe/execute)
- Permission levels: `safe-read` (auto), `write` (conditional), `destructive` (always approve), `external-side-effect` (always approve)
- Every action produces an `AuditRecord` via governance
- Approval is decided by the orchestrator before calling `execute()` — the port only records the result
- Notion is the first reference connector; MVP scope: search + read (page/block) + create + append
- Three backend types: Direct API / MCP-compatible / Integration hub — all behind the same port

Next step: design the Notion-specific connector adapter (NotionConnectorAdapter) using this port as the contract.
