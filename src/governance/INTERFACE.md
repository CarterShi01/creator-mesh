# Interface: src/governance

## Purpose

`governance` provides the control, safety, approval, and audit layer of CreatorMesh. It ensures that the creator remains in the loop for significant decisions and that the system's actions are auditable over time.

## Public Concepts

### Implemented (MVP)

**`GovernancePermissionLevel`**
Unified permission level type covering both connector and runner permission levels. Defined in governance so the evaluator does not need to import from `src/connectors` or `src/runners`.
```
"safe-read" | "write" | "destructive" | "execute" | "external-side-effect" | "human"
```

**`GovernanceDecision`**
The outcome of a governance evaluation.
```
GovernanceDecision {
  decision: "auto-approved" | "denied" | "requires-approval"
  reason: string
}
```

**`GovernanceEvaluator`**
Stateless evaluator. Maps a `GovernancePermissionLevel` + a boolean `humanReviewApproved` to a `GovernanceDecision`. MVP conservative policy:
- `safe-read` → `auto-approved`
- `human` → `auto-approved`
- `destructive` → `denied` (always; no override in MVP)
- `write` / `execute` / `external-side-effect` → `auto-approved` when `humanReviewApproved`; `requires-approval` otherwise

```
GovernanceEvaluator {
  evaluate(permissionLevel: GovernancePermissionLevel, humanReviewApproved: boolean): GovernanceDecision
}
```

### Planned (not yet implemented)

- `ApprovalRequest` — a request raised when a significant action requires human review before proceeding
- `ApprovalResult` — the creator's response to an approval request (approved, rejected, deferred)
- `ApprovalPolicy` — a rule that determines when an approval is required
- `PermissionPolicy` — a rule that determines which operations are allowed in which contexts
- `AuditRecord` — a log entry recording a significant action, decision, or state change
- `RiskLevel` — a classification of how risky or reversible an action is (low, medium, high, critical)
- `CostLimit` — a configured cap on token usage or external API calls per session or period

## Inputs

- `ApprovalRequest` from `src/orchestrator` or `src/workflows`
- Actions requiring audit recording from any layer

## Outputs

- `ApprovalResult` returned to `src/orchestrator` or `src/workflows`
- `AuditRecord` persisted via `src/storage`

## Allowed Dependencies

- `src/core`
- `src/shared`
- `src/storage` (for persisting audit records)

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge`
- `src/orchestrator` (governance does not call back into the orchestrator)
- `src/agents`
- `src/runners`
- `src/connectors`
- `src/workflows`
- `src/outputs`

## Invariants

- Governance must not be bypassed. Any action classified as medium risk or above must pass through an approval checkpoint.
- Audit records must be append-only. Past records must not be modified.
- Governance policies must be externally configurable without code changes.

## Main Files

Implemented:
- `evaluator.ts` — `GovernanceEvaluator`, `GovernanceDecision`, `GovernancePermissionLevel`
- `index.ts` — barrel re-exports

Planned:
- `approval.ts` — `ApprovalRequest`, `ApprovalResult`, approval checkpoint logic
- `audit.ts` — `AuditRecord`, append-only audit persistence
- `policy.ts` — `ApprovalPolicy`, `PermissionPolicy` rule evaluation

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
