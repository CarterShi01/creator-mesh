# Core

The `core` directory contains the stable domain primitives of CreatorMesh.

This layer defines the basic concepts that remain valid regardless of which tools, agents, workflows, or integrations are used.

Examples of core concepts may include:

- Thought
- Message
- Trigger
- CaptureItem
- KnowledgeItem
- AgentTask
- WorkflowRun
- ApprovalRequest
- OutputArtifact

## What belongs here

- Stable domain types
- Core interfaces
- Shared internal models
- Cross-layer concepts that are independent of external tools

## What does not belong here

- Tool-specific integration code
- Agent prompts
- Workflow implementation details
- UI code
- Storage-specific logic
- Business logic tied to a single use case

## Role in the architecture

`core` defines what the main objects in CreatorMesh are.

It should be one of the most stable parts of the system. Other layers may depend on `core`, but `core` should not depend on other layers.
