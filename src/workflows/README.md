# Workflows

The `workflows` directory contains end-to-end flows that connect multiple layers of the system.

A workflow describes how CreatorMesh transforms an input into a useful output.

Possible future workflows may include:

- Thought to structured note
- Thought to idea brief
- Message to response draft
- Message to action item
- Idea to project plan
- Idea to GitHub issues
- Project task to coding runner
- Weekly review generation
- Cognitive tree maintenance

## What belongs here

- High-level workflow definitions
- Step composition
- Workflow input and output contracts
- Reusable flow templates
- Use-case-specific process definitions

## What does not belong here

- Low-level connector implementation
- Raw prompt-only agent definitions
- Storage adapter details
- UI components
- Stable domain primitives

## Role in the architecture

`workflows` expresses CreatorMesh's main value: transforming thoughts and messages into knowledge, plans, actions, workflows, and shipped products.

Specific processes, such as cognitive tree maintenance, should live here or in workflow-specific submodules rather than defining the entire top-level architecture.
