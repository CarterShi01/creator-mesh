# Shared

The `shared` directory contains utilities that are used across multiple layers.

Shared code should remain small and generic.

## What belongs here

- Common utilities
- Error helpers
- Logging helpers
- Configuration helpers
- Small reusable functions

## What does not belong here

- Business logic
- Agent role definitions
- Tool-specific connectors
- Workflow-specific logic
- Domain models that belong in `core`

## Role in the architecture

`shared` supports other directories without becoming a dumping ground for unclear code.
