# Interface: src/connectors

## Purpose

`connectors` provides the external system boundary of CreatorMesh. All external tool integrations are accessed through **ConnectorPort** — a normalized capability interface that decouples the rest of the system from provider-specific APIs, SDKs, and authentication mechanisms.

## Public Concepts

### Core Port and Registry

**`ConnectorPort`**
The standard interface every connector adapter must implement. Callers in `src/orchestrator`, `src/workflows`, and `src/outputs` interact only with this interface — never with a specific adapter.

```
ConnectorPort {
  connectorId: string
  capabilities(): CapabilityRegistry
  execute(action: ConnectorAction): Promise<ConnectorResult>
}
```

**`CapabilityRegistry`**
Declares which capabilities a connector supports. Built at connector initialization time.

```
CapabilityRegistry {
  connectorId: string
  capabilities: Capability[]
  supports(type: CapabilityType, resourceType?: string): boolean
  get(type: CapabilityType, resourceType?: string): Capability | undefined
}
```

**`Capability`**
A single declared capability of a connector.

```
Capability {
  id: string                         // unique within this connector
  type: CapabilityType
  resourceType: string               // e.g. "page", "block", "database"
  permissionLevel: PermissionLevel
  approvalRequirement: ApprovalRequirement
  reversible: boolean
  description: string
}
```

### Type Enumerations

**`CapabilityType`**
```
"read" | "search" | "create" | "update" | "append"
| "delete" | "sync" | "subscribe" | "execute"
```

**`PermissionLevel`**
```
"safe-read"              // read-only, no external side effects — auto-approved
| "write"                // creates or modifies data — conditional approval
| "destructive"          // deletes or irreversibly changes data — always requires approval
| "external-side-effect" // any action visible to other users or external systems — always requires approval
```

**`ApprovalRequirement`**
```
"never"         // auto-approved; no human review needed
| "conditional"  // approval required based on scope or governance policy
| "always"       // every invocation requires explicit creator approval
```

### Action and Result

**`ConnectorAction`**
The structured record of a requested connector operation. Created by the orchestrator or workflow before calling `ConnectorPort.execute()`.

```
ConnectorAction {
  connectorId: string
  capability: Capability
  resourceType: string
  resourceId?: string               // known resource reference, if applicable
  payload?: Record<string, unknown> // structured input (e.g. query, page_id, parent+title)
  payloadSummary?: string           // human-readable summary for audit display
  requestedAt: Date
  approvalResult?: "approved" | "rejected" | "auto-approved"
  status: "pending" | "approved" | "executing" | "completed" | "failed" | "rejected"
}
```

**`ConnectorResult`**
The structured outcome of a connector execution.

```
ConnectorResult {
  connectorId: string
  action: ConnectorAction
  status: "success" | "failure" | "partial"
  data?: unknown                    // normalized output; shape varies by capability type
  error?: string
  completedAt: Date
  auditId: string                   // UUID of the AuditRecord persisted by src/governance
}
```

### Configuration

**`ConnectorConfig`**
Injected at connector initialization. Contains credentials, base URLs, and per-connector settings. Raw secrets are never stored in `ConnectorAction` or `ConnectorResult`.

```
ConnectorConfig {
  connectorId: string
  [key: string]: unknown            // connector-specific fields
}
```

## Inputs

- `ConnectorAction` from `src/orchestrator` or `src/workflows`
- `ConnectorConfig` injected at initialization (from environment or secure config)

## Outputs

- `ConnectorResult` returned to `src/orchestrator`, `src/workflows`, or `src/outputs`
- `AuditRecord` (via `src/governance`) — produced for every `execute()` call

## Allowed Dependencies

- `src/triggers`
- `src/shared`

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge`
- `src/orchestrator` (connectors do not call back into the orchestrator)
- `src/agents`
- `src/runners`
- `src/workflows`
- `src/governance` (connectors do not call governance directly — the orchestrator handles approval before calling execute)
- `src/storage`
- `src/outputs`

## Invariants

- **All callers use `ConnectorPort`** — no caller imports a specific adapter class.
- **Every `execute()` call produces an audit record** — the `auditId` in `ConnectorResult` must reference a persisted `AuditRecord`.
- **Approval is decided before `execute()` is called** — `ConnectorAction.approvalResult` must be set by the orchestrator before the port is invoked. The port records the decision; it does not make it.
- **Credentials flow through `ConnectorConfig` only** — no raw secrets appear in `ConnectorAction`, `ConnectorResult`, or any log.
- **Each connector implements a common port** — adapters are interchangeable from the caller's perspective.

## Connector Backend Types

Three backend types implement `ConnectorPort`:

1. **Direct API adapter** — thin wrapper over a provider SDK (e.g. Notion SDK)
2. **MCP-compatible adapter** — wraps an MCP server exposing the tool
3. **Integration hub adapter** — wraps an external automation backend (n8n, Zapier, etc.)

All three implement `ConnectorPort`. The backend type is an internal implementation detail of the adapter.

## Main Files

Implemented:
- `types.ts` — `CapabilityType`, `PermissionLevel`, `ApprovalRequirement`, `ApprovalResult`, `ActionStatus`, `ResultStatus` enumerations
- `port.ts` — `ConnectorPort`, `CapabilityRegistry`, `Capability`, `ConnectorAction`, `ConnectorResult`, `ConnectorConfig` interfaces
- `index.ts` — barrel re-exports
- `notion/` — Notion connector adapter (Direct API backend); see `notion/INTERFACE.md`

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `DESIGN.md` — the full ConnectorPort and CapabilityRegistry design.
4. Read this `INTERFACE.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
7. Apply bottom-up propagation: check whether `src/orchestrator`, `src/outputs`, or `src/workflows` INTERFACE.md or DESIGN.md needs a corresponding update.
