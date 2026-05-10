# Creation

`src/creation` is the semantic kernel of CreatorMesh. It defines how the system understands and evolves what the creator is pursuing. It does not execute tools directly. Instead, it frames quests, constructs objects, maps relations, proposes actions, tracks artifacts, and absorbs feedback. Runtime, agents, workflows, runners, connectors, governance, storage, and outputs execute and persist this work through their own boundaries.

## What creation answers

- What is the creator pursuing? (Quest)
- What things matter and need to be maintained? (Object)
- How do quests, objects, actions, and artifacts connect? (Relation)
- What is the next meaningful move? (Action)
- What has been produced? (ArtifactRef)
- What should change based on outcomes? (Feedback)

## What belongs here

- **Quest** — the core pursuit, long-term question, and value anchor behind a body of work
- **CreatorObject** — any entity worth maintaining and evolving: a project, a knowledge domain, a student, a plan, a career arc, a startup idea, a decision, a system
- **CreationRelation** — how quests, objects, actions, artifacts, and feedback connect (supports, depends_on, derived_from, generates, applies_to, improves, implements, reviews…)
- **CreatorAction** — the next meaningful semantic move: a user-level intention to evaluate, summarize, plan, compare, generate, review, or refactor
- **ArtifactRef** — a semantic reference to a produced output: document, code diff, PR, lesson plan, report, prompt, Notion page, email draft
- **FeedbackRecord** — reflection, evaluation, real-world outcome, or revision signal that updates quests, objects, actions, and future directions

## What does not belong here

- LLM loop execution, session management, or tool invocation — `runtime` owns that
- Workflow engine logic or step orchestration — `workflows` owns that
- Approval, audit, and governance policies — `governance` owns that
- Output formatting and write-back preparation — `outputs` owns that
- Connector adapters for Notion or other external tools — `connectors` owns that
- Runner execution (Claude Code, subprocess, etc.) — `runners` owns that
- Soft knowledge assets, skills, principles, examples — `knowledge` owns those
- Storage implementation — `storage` owns that

## What creation is NOT

- Not the runtime loop — `runtime` executes the system safely; creation provides semantic direction
- Not a project management clone or task scheduler
- Not a notes database — structured knowledge assets live in `knowledge`
- Not a workflow engine — step composition and execution live in `workflows`
- Not a connector — external calls go through `connectors` and `runners`

## Creation is the worldview

Creation is where CreatorMesh's internal philosophy lives:

- **Subject intention** — creation starts from what the creator is pursuing, not from a list of tasks
- **Quest-driven thinking** — everything is anchored to a durable pursuit with meaning and direction
- **Object-oriented cognition** — meaningful things are modeled as objects with properties, state, relations, actions, artifacts, and feedback
- **Causal and value reasoning** — creation preserves why something matters: which quest it serves, which object it improves, which action it triggers, which artifact it produced, which feedback changed the system
- **Language grounding** — creation helps turn vague language ("I want more freedom") into maintainable objects (career plan, immigration path, income model) and actions
- **Artifact accumulation** — every meaningful output is anchored back to the quest and object that motivated it
- **Feedback evolution** — outputs are not the end; feedback updates quests, objects, actions, future workflows, and knowledge

## Relationship to adjacent layers

**runtime** — creation does not run the LLM loop. Creation produces semantic intentions (proposed action, object update, artifact reference, feedback record, relation creation). Runtime and lower layers execute these safely.

"Creation decides what should be understood and evolved. Runtime decides how the system safely runs the execution loop."

**knowledge** — knowledge provides soft knowledge, skills, principles, examples, methods, and domain context. Creation may consult knowledge when interpreting quests, objects, actions, and feedback.

**agents** — agents are role-based execution subjects. Creation may request agent involvement. Agents do not own the worldview.

**workflows** — workflows are stable creator routines. Creation may choose or suggest workflows. Workflows should not enumerate every possible tool-specific automation.

**runners / connectors** — physical execution capabilities. Creation should not directly depend on them.

## Role in the architecture

`creation` sits between `runtime` and `knowledge + agents + workflows` in the layered architecture:

```
runtime
  ↓
creation  ← worldview and methodological kernel
  ↓
knowledge + agents + workflows
```

Without `creation`, durable semantic state — what the user is pursuing, what objects matter, what feedback changed the system — would scatter across `knowledge`, `workflows`, `governance`, `outputs`, and `runtime`, making the system harder to reason about and extend.
