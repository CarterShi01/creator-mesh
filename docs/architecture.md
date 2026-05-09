# CreatorMesh Architecture

CreatorMesh is a personal agent operating system for independent creators.

Its architecture is designed around two core input primitives:

- Thoughts: internally generated ideas, reflections, notes, insights, plans, and personal thinking.
- Messages: externally triggered opportunities, feedback, requests, conversations, work items, and tasks.

CreatorMesh transforms these inputs into:

- Structured knowledge
- Plans
- Actions
- Workflows
- Shipped products

## Architectural Layers

CreatorMesh is organized into the following conceptual layers:

1. Core  
   Defines the stable domain primitives and internal concepts.

2. Triggers  
   Receives or represents the initial signal that something should happen.

3. Intake  
   Normalizes raw inputs into internal capture items.

4. Knowledge  
   Turns inputs into structured thoughts, notes, ideas, plans, and other knowledge assets.

5. Orchestrator  
   Coordinates decisions, routing, state transitions, and human approval checkpoints.

6. Agents  
   Defines domain-specific reasoning roles.

7. Runners  
   Executes work through tools such as coding agents, scripts, or manual human execution.

8. Connectors  
   Integrates with external tools such as knowledge systems, communication tools, code platforms, and gateways.

9. Workflows  
   Defines end-to-end transformations from input to output.

10. Governance  
   Handles approval, permissions, auditability, cost control, and safety.

11. Storage  
   Persists workflow state, knowledge references, approvals, and agent run records.

12. Outputs  
   Produces final artifacts and prepares write-back payloads.

13. Shared  
   Provides small reusable utilities across layers.

## Design Direction

CreatorMesh should be:

- Trigger-first
- Creator-first
- Tool-agnostic
- Local-first where possible
- Human-in-the-loop by default
- Extensible through agents, runners, and connectors
- Auditable and controllable

## Core Distinction

`core` and `orchestrator` are intentionally separate.

`core` defines the stable concepts of the system.

`orchestrator` coordinates what happens next when the system processes an input.

In short:

- `core` defines what things are.
- `orchestrator` decides how things move.

The project should start small, but its structure should allow it to grow into a broader personal workbench for thoughts, messages, knowledge, planning, execution, and product creation.
