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

4. Runtime
   Executes and dispatches work safely. Receives already-framed execution work from workflows and creation-facing flows, dispatches steps to agents, runners, and connectors, applies governance checks before side effects, and supports pause/resume behavior. Does not own the CreatorMesh worldview or methodological core; `creation` does.

5. Agents
   Domain-specific reasoning roles. Execute within workflow steps and produce structured outputs.

6. Capabilities
   Groups callable physical and provider-backed capabilities. Invoked by runtime and agents through port interfaces. Contains: `runners` (execution environments: Claude Code, human runner, future Codex/OpenHands/Aider), `connectors` (external system integrations: Notion, GitHub, future MCP servers), and `models` (scaffold only — future model-provider/inference capabilities). Capabilities do not own the worldview, LLM loop, or session/context. Provider SDKs are isolated inside adapter implementations.

7. Workflows
   Defines stable, creator-approved end-to-end transformations from inputs to outputs.

8. Governance
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
- Extensible through agents and capabilities (runners, connectors, models)
- Auditable and controllable

## Core Distinction

`triggers`, `creation`, and `runtime` are intentionally separate.

`triggers` defines the stable input primitives and represents input signals entering the system.

`creation` is the methodological core — it interprets intent, frames quests, constructs objects, maps relations, and tracks artifacts.

`runtime` is the execution loop layer — it dispatches already-framed work safely, enforces governance policies, and supports pause/resume.

In short:

- `triggers` defines what things are and where they come from.
- `creation` interprets intent and frames the work.
- `runtime` executes and dispatches work safely.
- `governance` provides policies; `runtime` invokes governance before side effects.

The project should start small, but its structure should allow it to grow into a broader personal workbench for thoughts, messages, knowledge, planning, execution, and product creation.
