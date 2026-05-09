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

## What belongs here

- External API clients
- Authentication wrappers
- Tool-specific data mapping
- Connector interfaces
- Read and write adapters for external systems

## What does not belong here

- Core domain definitions
- Agent role instructions
- Orchestration policy
- Workflow decisions
- Internal knowledge modeling

## Role in the architecture

`connectors` lets CreatorMesh communicate with the outside world while keeping the core architecture tool-agnostic.

External tools should be integrations, not architectural centers.
