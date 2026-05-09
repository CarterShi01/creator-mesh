# Interface: src/connectors

## Purpose

`connectors` provides integrations with external systems. It allows CreatorMesh to read from and write to tools such as knowledge bases, communication platforms, code repositories, and file systems. External tool logic is isolated here, keeping the rest of the architecture tool-agnostic.

## Public Concepts

- `ConnectorAdapter` — a common interface for reading from and writing to an external system
- `ConnectorConfig` — configuration for authenticating and connecting to an external system
- `ReadRequest` — a structured request to read data from an external tool
- `ReadResult` — the data returned from an external tool read operation
- `WritePayload` — a structured payload to be written to an external tool
- `WriteConfirmation` — the result of a write operation, including status and reference

Possible future connectors:
- `NotionConnector`
- `GitHubConnector`
- `EmailConnector`
- `CalendarConnector`
- `SlackConnector`
- `TelegramConnector`
- `XMindConnector`
- `FileSystemConnector`

## Inputs

- `WritePayload` from `src/outputs`
- `ReadRequest` from `src/workflows` or `src/orchestrator`

## Outputs

- `ReadResult` to `src/knowledge`, `src/workflows`, or `src/orchestrator`
- `WriteConfirmation` to `src/outputs` or `src/orchestrator`

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
- `src/workflows`
- `src/governance`
- `src/storage`
- `src/outputs`

## Invariants

- Each connector must implement a common adapter interface so tools are interchangeable.
- Connectors must not contain domain logic, agent reasoning, or workflow decisions.
- Authentication credentials must not be hardcoded. Configuration should flow in through `ConnectorConfig`.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read this `INTERFACE.md`.
4. Read this directory's `README.md`.
5. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
6. Update this file if the public contract changes.
