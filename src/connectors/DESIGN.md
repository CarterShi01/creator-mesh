# Design: src/connectors

## Current Design Summary

`connectors` provides adapters that read from and write to external systems. Each external tool (Notion, GitHub, email, etc.) has its own connector adapter. Notion is the first planned connector. No implementation files exist yet. The layer is isolated so that external tool changes do not propagate into the core architecture.

## Design Goals

- Keep all external tool specifics (API clients, authentication, data mapping) inside connector adapters.
- Define a common `ConnectorAdapter` interface so tools are interchangeable and testable.
- Prevent external tool dependencies from leaking into `core`, `knowledge`, or `orchestrator`.

## Key Decisions

- **Adapter pattern**: each connector implements `ConnectorAdapter` with `read(ReadRequest)` and `write(WritePayload)` methods. Callers (outputs, workflows, orchestrator) use the interface, not the concrete adapter.
- **Authentication flows through `ConnectorConfig`**: no credentials are hardcoded. Config is injected at runtime.
- **Notion is a connector, not an architectural center**: Notion read/write is a connector concern. The knowledge model is internal and tool-agnostic; the Notion connector maps between the two.

## Tradeoffs

- A common `read/write` interface covers most integration patterns but may be too coarse for connectors that need batch operations, streaming, or webhook setup. Per-connector extensions may be needed.
- Keeping connectors isolated from `knowledge` means data mapping (internal KnowledgeItem ↔ Notion page) must happen somewhere — likely in the connector adapter itself or in a workflow step.

## Alternatives Considered

- **Notion as a first-class storage backend in `src/storage`** — rejected. Notion is an external tool, not an internal storage layer. Mixing them would tie the storage interface to Notion's API shape.
- **Connectors calling knowledge or orchestrator directly** — rejected. Connectors are integration adapters; they hand results back to callers, not forward them to other layers.

## Current Assumptions

- The Notion connector will be designed (DESIGN.md) before implementation begins.
- The first Notion operation will be a page read or write for a `StructuredThought`.
- Authentication for Notion will use an API key passed via environment variable, not OAuth at launch.

## Open Questions

- Should data mapping (internal model ↔ external format) live inside the connector adapter, in a separate mapper module, or in the workflow that uses the connector?
- How are connector errors (rate limit, auth failure, network timeout) represented and propagated back to the orchestrator?
- Should the Notion connector support two-way sync, or only one-way write from CreatorMesh to Notion at v1?

## Future Evolution

- Additional connectors: GitHub, email, calendar, Slack, Telegram, XMind, file system.
- A connector registry may emerge for dynamic connector selection at runtime.
- OAuth and token refresh flows will be needed before multi-user or cloud deployments.

## ChatGPT Handoff Context

`src/connectors` has no implementation yet. Design intent: adapter pattern for external tools. Common `ConnectorAdapter` interface with `read` and `write`. First implementation target: Notion connector. Key constraint: Notion is a connector, not an architecture center — internal model stays in `src/knowledge`. All auth via `ConnectorConfig`, no hardcoded credentials. Data mapping between internal and external formats is an open design question.
