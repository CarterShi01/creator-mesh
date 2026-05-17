# Knowledge

> **Status: Planned (Phase 2/3 target)**
> This module owns callable soft knowledge assets. No implementation code exists yet. Phase 1 dispatch does not depend on it.
> When naming new Phase 1 constructs that relate to this module's concepts, use [convergence.md](../../docs/control-plane/convergence.md) to find the aligned name.

`src/knowledge` owns callable soft knowledge.

Knowledge provides the soft cognitive substrate for CreatorMesh. It contains reusable domain understanding, skills, principles, examples, checklists, and context that can be called by `creation` and `agents` when interpreting problems or producing outputs.

Knowledge is not raw captured input. It is the distilled, reusable reasoning material that the system and its agents can draw on.

## What belongs here

- Reusable domain knowledge and professional knowledge
- Principles, frameworks, and reasoning patterns
- Examples and analogies
- Checklists and rubrics
- Prompt patterns and instruction templates
- Context briefs and methodology fragments
- Skills — a skill is one important kind of knowledge asset: a structured, callable capability description that an agent can apply to a task

## What does not belong here

- Workflow execution types (WorkflowRun, WorkflowStep, etc.) — `src/workflows` owns those
- Runtime session memory or execution context — `runtime` owns that
- External connector storage or provider-specific data — `connectors` and `storage` own that
- Raw notes generated directly from inputs — those belong in `triggers` or workflow outputs
- Physical execution logic — `agents`, `runners`, and `connectors` execute; knowledge supports reasoning
- Direct Notion API calls, XMind integration, or any provider SDK

## What knowledge is NOT

- Not a runtime session store or LLM context buffer
- Not a database of connector outputs
- Not just "notes generated from thoughts"
- Not the physical executor — knowledge supports reasoning, it does not run tasks

## Relationship to agents and workflows

`agents` use knowledge when applying domain expertise to a task — a ThoughtAgent may draw on writing principles, a CareerAgent on career frameworks, a ResearchAgent on research methodologies.

`workflows` may load relevant knowledge before an agent step to give agents better reasoning context.

Knowledge is the soft layer. It does not own goals or artifacts, and it does not execute work. It provides the reasoning material that enables informed action.

## Role in the architecture

`knowledge` sits alongside `agents` and `workflows` in the layer below `runtime`, above `runners`, `connectors`, `governance`, and `storage`.

It is tool-agnostic. Notion may store some knowledge artifacts, but the knowledge layer itself does not depend on Notion or any other external system. Knowledge assets should be callable regardless of which storage backend or connector is active.
