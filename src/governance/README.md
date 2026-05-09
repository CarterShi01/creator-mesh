# Governance

The `governance` directory contains control, safety, approval, and audit mechanisms.

CreatorMesh should be human-in-the-loop by default. The creator should be able to review, correct, approve, reject, or pause important actions.

## What belongs here

- Approval policies
- Permission policies
- Audit logging models
- Cost and usage limits
- Risk levels
- Human review checkpoints
- Safety constraints

## What does not belong here

- Agent role content
- External API client details
- UI-specific approval screens
- Tool-specific execution code
- Domain knowledge models

## Role in the architecture

`governance` keeps CreatorMesh controllable, auditable, and safe to use as it grows more powerful.

This layer is especially important because CreatorMesh may eventually interact with personal notes, external messages, code, workflows, and connected tools.
