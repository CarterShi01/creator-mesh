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

1. Triggers
   The interaction boundary of the system. Receives internally generated thoughts, externally triggered messages, user actions, external events, and system signals. Defines stable input primitives (Thought, Message) and normalizes inputs for downstream processing. Formerly split across `core`, `triggers`, and `intake` — now unified.

2. Creation
   The methodological core. Interprets intent, frames quests, constructs creator objects, maps relations, proposes actions, tracks artifacts, and absorbs feedback. Owns long-running creation domain state.

3. Knowledge
   Callable soft knowledge — skills, principles, domain context, and structured knowledge assets available to agents and workflows.

4. Orchestrator
   Coordinates routing, step dispatch, state transitions, and human approval checkpoints. Decides how things move through the system without defining what they are.

5. Agents
   Domain-specific reasoning roles. Execute within workflow steps and produce structured outputs.

6. Runners
   Executes work through specific execution environments (e.g., Claude Code via subprocess, future: Codex, OpenHands, Aider, scripts, human).

7. Connectors
   Integrates with external tools (e.g., Notion SDK) through ConnectorPort and CapabilityRegistry.

8. Workflows
   Defines stable, creator-approved end-to-end transformations from inputs to outputs.

9. Governance
   Handles approval policies, permission levels, auditability, cost control, and safety.

10. Storage
    Persists workflow run state, knowledge references, agent runs, approval records, and audit logs.

11. Outputs
    Produces final artifacts and prepares write-back payloads for external tools.

12. Shared
    Small reusable utilities across layers.

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

`triggers` and `orchestrator` are intentionally separate.

`triggers` defines the stable input primitives and represents input signals entering the system.

`orchestrator` coordinates what happens next when the system processes an input.

In short:

- `triggers` defines what things are and where they come from.
- `orchestrator` decides how things move.

The project should start small, but its structure should allow it to grow into a broader personal workbench for thoughts, messages, knowledge, planning, execution, and product creation.
