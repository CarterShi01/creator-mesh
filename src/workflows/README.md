# Workflows

`src/workflows` owns stable creator routines.

A workflow is a reusable, creator-approved routine for recurring work. It represents a stable pattern for handling a class of tasks — a reliable procedure that the creator or system has decided is worth preserving and repeating.

Workflows are stable creator routines. They should represent repeatable ways of handling work that the creator or system has decided are worth preserving. They are not meant to enumerate every possible tool call. Dynamic tool choice belongs to the runtime/agent execution path; workflow definitions preserve stable routines.

A workflow may be executed by `runtime` and may call agents, knowledge, runners, connectors, governance, and storage through proper ports and boundaries.

## What belongs here

- Stable, creator-approved workflow definitions
- Step composition (AgentStep, ConnectorStep, RunnerStep, HumanReviewStep)
- Workflow input and output contracts
- Reusable routine templates for recurring work
- `LocalWorkflowRunner` and `WorkflowRunnerPort` — execution infrastructure for workflow dispatch

## What does not belong here

- The LLM loop or execution session management — `runtime` owns that
- One workflow per specific connector/tool combination (e.g. ThoughtToNotion, MessageToGmail, IdeaToLinear)
- An exhaustive enumeration of every possible tool-specific scenario
- Low-level connector or runner implementation
- UI components or storage adapters

## What workflows are NOT

- Not the runtime loop — `runtime` owns execution lifecycle, session/context, permission gate, and tool invocation
- Not a replacement for dynamic agent tool use
- Not a catalog of every connector call the system could make
- Not hardcoded business logic that grows without bound

## Current implementation

`ThoughtToNoteWorkflow` is the first implemented workflow. It is an MVP/demo workflow that demonstrates governed execution and human review — classify → human-review pause → write-notion. It should not be read as the future pattern for every tool-specific automation. Its value is validating the workflow model: StepExecutor dispatch, input mapping, GovernanceEvaluator enforcement, and HumanReviewStep pause/resume behavior.

## Examples of appropriate future workflows

Workflows should represent stable, high-value creator routines:

- Weekly Review
- Idea Evaluation
- Book Note Distillation
- Career Decision Review
- Project Planning
- Code Change Review
- Visa Material Packaging
- Lesson Plan Generation
- Inbox Triage

These are stable routines — not one-off tool calls and not per-connector automations.

## Role in the architecture

`workflows` sits below `runtime` and above `runners`, `connectors`, `governance`, and `storage`.

- `runtime` executes the workflow safely, enforcing governance and managing session state.
- `workflows` defines the stable routine structure that runtime follows.
- `agents`, `runners`, and `connectors` provide the callable capabilities that workflow steps invoke.

Workflows express CreatorMesh's stable operational patterns — not its worldview, and not its execution engine.
