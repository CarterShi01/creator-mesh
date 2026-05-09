# Design: src/workflows

## Current Design Summary

`workflows` defines end-to-end flows that compose multiple layers into coherent processes delivering value to the creator. A workflow turns a `CaptureItem` into an `OutputArtifact` by orchestrating agents, runners, connectors, and governance checkpoints. `workflows` is the highest-level integration layer. No implementation files exist yet.

## Design Goals

- Express CreatorMesh's main product value: thoughts and messages becoming structured knowledge, plans, actions, and shipped products.
- Compose agents, runners, connectors, and governance into readable, auditable workflow definitions.
- Keep individual workflow definitions decoupled from connector-specific and runner-specific implementation details.

## Key Decisions

- **Workflow definitions are data + code, not just code**: a `WorkflowDefinition` carries metadata (name, version, steps, governance checkpoints) that can be read and audited independently of execution.
- **Workflows depend on `src/orchestrator`**: workflow steps are coordinated by the orchestrator. Workflows define the process; the orchestrator drives it.
- **Explicit governance checkpoints in workflow definitions**: every workflow that affects external systems or personal data must declare its approval checkpoints as part of the definition, not as implementation-time surprises.
- **Workflows do not call `src/intake` or `src/triggers`**: they receive normalized inputs from the orchestrator.

## Tradeoffs

- A workflow that depends on orchestrator, agents, runners, connectors, knowledge, governance, and storage has a broad dependency surface. This is expected — workflows are the integration point. The risk is that workflow code becomes a dumping ground for logic that should live in more specific layers.
- Defining governance checkpoints in the workflow definition rather than detecting them dynamically requires workflow authors to be explicit about risk upfront, which adds design work but prevents silent bypasses.

## Alternatives Considered

- **Workflows as pure orchestrator logic** — rejected. Mixing workflow definitions into the orchestrator would make the orchestrator a monolith and prevent workflows from being read as independent specifications.
- **Workflows calling connectors and runners directly** — acceptable but risky. Routing all calls through the orchestrator adds clarity and ensures approval checkpoints are never skipped.

## Current Assumptions

- The first workflow to design will be `ThoughtToNoteWorkflow`: receive a `Thought` `CaptureItem`, route to `ThoughtAgent`, produce a `StructuredThought`, optionally write to Notion via connector.
- Workflow definitions will be TypeScript objects at v1, not external configuration files.
- All workflow runs will be persisted as `WorkflowRun` records in `src/storage`.

## ConnectorAction in Workflows (resolved from src/connectors design)

`ConnectorAction` is now a defined concept. A `WorkflowStep` that interacts with an external system produces a `ConnectorAction` and passes it through the orchestrator for approval before execution.

Key implications:
- `ConnectorAction` (from `src/connectors`) is the concrete form of `ConnectorAction` listed in the workflow concepts above.
- A `HumanReviewStep` may be inserted before any workflow step that produces a `ConnectorAction` with `approvalRequirement: "always"` or `"conditional"`.
- The `auditId` from `ConnectorResult` should be recorded in the `WorkflowRun` step history for traceability.
- Workflows compose `ConnectorPort` calls via the orchestrator — they do not call `ConnectorPort.execute()` directly.

## Open Questions

- Should workflow definitions be code (TypeScript) or data (JSON/YAML)? Code is type-safe and composable; data allows non-developer editing and future GUI authoring.
- How are long-running workflows (e.g., a multi-day project plan that evolves over time) represented and resumed?
- Should workflows support conditional branches (if agent output is X, go to step A; otherwise go to step B), or is a linear step model sufficient for phase 1?

## Future Evolution

- Additional workflows: MessageToActionWorkflow, IdeaToProjectPlanWorkflow, WeeklyReviewWorkflow, CognitiveTreeWorkflow.
- A workflow editor or visual builder may emerge for non-developer creators.
- Parallel step execution within a workflow for tasks that can proceed simultaneously.

## ChatGPT Handoff Context

`src/workflows` has no implementation yet. Highest-level integration layer. A `WorkflowDefinition` names steps, declares governance checkpoints, and references agent roles, runners, and connectors. Coordinated by `src/orchestrator`. Results persisted as `WorkflowRun` in `src/storage`. Outputs delivered via `src/outputs` → `src/connectors`. First implementation target: `ThoughtToNoteWorkflow`. Key open question: TypeScript workflow definitions vs. data-driven configuration.
