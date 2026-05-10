# Interface: src/capabilities

## Purpose

`capabilities` groups callable physical and provider-backed capabilities used by `runtime` and `agents`. It does not own the CreatorMesh worldview, LLM loop, session/context, or semantic creation concepts.

## Public Submodules

### runners

`src/capabilities/runners` — execution environment adapters.

Key public types: `RunnerPort`, `RunnerRegistry`, `RunnerAction`, `RunnerResult`, `RunnerArtifact`, `RunnerCapability`, `RunnerConfig`, `RunnerContext`, `RunnerTaskType`, `RunnerPermissionLevel`

See `src/capabilities/runners/INTERFACE.md` for the full contract.

### connectors

`src/capabilities/connectors` — external system integrations.

Key public types: `ConnectorPort`, `CapabilityRegistry`, `ConnectorAction`, `ConnectorResult`, `Capability`, `ConnectorConfig`, `CapabilityType`, `PermissionLevel`

See `src/capabilities/connectors/INTERFACE.md` for the full contract.

### models

`src/capabilities/models` — scaffold only. No public types defined yet.

See `src/capabilities/models/INTERFACE.md` for the deferred design intent.

## Top-Level Barrel Export

`src/capabilities/index.ts` uses namespace-style exports to avoid type name collisions between submodules:

```typescript
export * as runners from "./runners/index.js";
export * as connectors from "./connectors/index.js";
export * as models from "./models/index.js";
```

Callers that need specific types should import directly from the submodule:

```typescript
import type { RunnerPort } from "../../capabilities/runners/port.js";
import type { ConnectorPort } from "../../capabilities/connectors/port.js";
```

## Allowed Dependencies

Each submodule's allowed dependencies are defined in its own INTERFACE.md. At the top-level:

- `src/shared`
- `src/workflows` (for port type references)
- `src/governance` (injected at construction; not imported at module level)

## Disallowed Dependencies

- `src/runtime` (capabilities provide ports; runtime invokes them — not the reverse)
- `src/creation` (capabilities must not depend on worldview semantics)
- `src/agents` (agents request capabilities; capabilities must not depend on agent definitions)
- `src/triggers` (capabilities receive already-normalized inputs through runtime)

## Invariants

- **Port isolation**: `RunnerPort` and `ConnectorPort` must not import provider SDK types. Provider SDKs are isolated inside adapter implementations.
- **No circular runtime dependency**: capabilities must not import from `src/runtime`.
- **Governance bypass forbidden**: capabilities must not execute side-effecting operations without governance checks from runtime.
- **models is scaffold only**: `src/capabilities/models` must not contain inference implementation in this version.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `src/capabilities/README.md`.
4. Read this `INTERFACE.md`.
5. Read the relevant submodule INTERFACE.md.
6. Identify whether the change affects a public port contract, adapter behavior, or type definition.
7. Update the relevant INTERFACE.md if the public contract changes.
