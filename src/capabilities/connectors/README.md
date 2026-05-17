# Connectors

The `connectors` directory contains integrations with external systems.

Connectors allow CreatorMesh to read from or write to external tools. They should be kept separate from core logic.

Possible future connectors may include:

- Notion
- GitHub
- OpenClaw
- Email
- Calendar
- Slack
- Telegram
- XMind
- Browser tools
- File systems

## Port Pattern

All connectors implement **ConnectorPort** — a single normalized interface with a `capabilities()` registry and an `execute(ConnectorAction)` method. Callers in `src/runtime`, `src/workflows`, and `src/outputs` depend only on `ConnectorPort`, never on a specific adapter.

The **CapabilityRegistry** declares which standard capabilities (read, search, create, update, append, delete, sync, subscribe, execute) a connector supports, at what permission level, and under what approval conditions.

See `DESIGN.md` for the full ConnectorPort and CapabilityRegistry design, and `INTERFACE.md` for the public type contracts.

## What belongs here

- `ConnectorPort` interface and type definitions
- `CapabilityRegistry` declarations per connector
- Connector adapter implementations (Direct API / MCP-compatible / integration hub)
- Authentication wrappers and `ConnectorConfig` handling
- Tool-specific data mapping (internal model ↔ external format)
- `ConnectorAction` and `ConnectorResult` construction

## What does not belong here

- Core domain definitions
- Agent role instructions
- Orchestration policy and approval decisions
- Workflow definitions
- Internal knowledge modeling
- Raw secrets or credentials (use `ConnectorConfig`)

## Role in the architecture

`connectors` is the external system boundary of CreatorMesh. It keeps all provider-specific logic isolated behind `ConnectorPort` so the core architecture remains tool-agnostic.

External tools should be integrations, not architectural centers. Notion is the first reference connector — it validates the port abstraction, not the other way around.
