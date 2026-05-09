# Orchestrator

The `orchestrator` directory contains the control layer of CreatorMesh.

The orchestrator decides what should happen next. It coordinates triggers, intake, knowledge, agents, workflows, governance, runners, connectors, storage, and outputs.

It should coordinate the system, not perform every task directly.

## What belongs here

- Dispatch logic
- Flow coordination
- Decision routing
- State transitions
- Human approval checkpoints
- Agent selection
- Runner selection
- Workflow coordination

## What does not belong here

- Tool-specific API code
- Low-level storage code
- Large prompt libraries
- Direct UI code
- Direct external service implementation
- Domain models that belong in `core`

## Role in the architecture

`orchestrator` decides how work moves through CreatorMesh.

A simple distinction:

- `core` defines what things are.
- `orchestrator` decides what happens next.
