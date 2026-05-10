# Design: src/creation

## Current Design Summary

`creation` is the semantic kernel and methodological core of CreatorMesh. It owns how the system understands and evolves what the creator is pursuing. It defines the worldview that gives runtime, agents, workflows, and knowledge their semantic direction.

The core model is: **Quest → Object → Relation → Action → ArtifactRef → Feedback**.

No implementation files exist yet. This document captures design intent, boundary rationale, the worldview skeleton, and the mapping from earlier creation concepts to the current model.

## Why creation is needed

The existing architecture has `Thought` and `Message` as input primitives and `runtime` as the execution loop. Those layers handle input and execution, but they do not represent what the creator is pursuing, what objects matter, or how outputs connect to intentions.

Without a dedicated creation layer, semantic state would scatter across `knowledge`, `workflows`, `governance`, `outputs`, and `runtime`, making each of those layers too broad and the system harder to reason about.

## Worldview Skeleton

The following are the conceptual building blocks of the creation worldview. They inform all future design decisions for this layer.

### 1. Subject Intention

Creation starts from a subject's intention, desire, problem, or pursuit. In MVP, this is represented through Quest. A full Subject model (with identity, history, and preferences) is out of scope for v1.

### 2. Language Grounding

Creation helps turn vague language into maintainable objects and actions.

Example: "I want more freedom" should eventually be grounded into objects such as:
- career plan
- immigration path
- income model
- family constraints
- action plans

Language grounding is a future capability. In MVP, creation records explicit quests and objects without automated language decomposition.

### 3. Object-Oriented Cognition

Creation treats meaningful things as objects with properties, state, relations, actions, artifacts, and feedback. This mirrors how experts think: not in flat lists of tasks, but in entities that evolve.

A `CreatorObject` can be a project, a codebase, a book note system, a student, a customer, a career plan, a knowledge domain, a teaching curriculum, a startup idea, or a decision.

### 4. Causal and Value Reasoning

Creation should preserve why something matters:
- Which Quest does it serve?
- Which Object does it improve?
- Which Action does it trigger?
- Which Artifact did it produce?
- Which Feedback changed the system?

This causal threading turns CreatorMesh from a flat task list into a semantic understanding of what the creator is building and why.

### 5. Interface-Oriented Decomposition

Objects should eventually expose:
- accepted inputs
- possible outputs
- available actions
- review needs
- feedback channels

**This is a future direction.** Do not implement a full object interface system yet.

### 6. Layered Approximation

Creation should support gradually breaking down complex pursuits into objects, relations, and actions. A quest may decompose into sub-quests; an object may decompose into sub-objects; an action may unfold into a workflow.

**This is a future direction.** Do not implement a tree engine yet.

### 7. Feedback Evolution

Creation treats feedback as first-class. Outputs are not the end. Feedback updates quests, objects, actions, future workflows, and knowledge assets. Without feedback, CreatorMesh only generates — it does not learn or evolve.

## Design Goals

- Frame user intention as Quest.
- Turn language into maintainable CreatorObjects.
- Connect objects and actions through CreationRelations.
- Propose meaningful CreatorActions.
- Track produced ArtifactRefs semantically.
- Absorb FeedbackRecords that update the system's understanding.
- Remain the semantic kernel; delegate execution entirely to runtime and lower layers.

## Runtime Boundary

Creation does NOT run the LLM loop.
Creation does NOT manage session or context state.
Creation does NOT invoke tools directly.
Creation does NOT enforce governance.

Creation can produce semantic intentions such as:
- proposed action
- object update
- artifact reference
- feedback record
- relation creation

"Creation decides what should be understood and evolved. Runtime decides how the system safely runs the execution loop."

## Legacy Concept Consolidation

The earlier creation model introduced concepts that are now subsumed by the Quest/Object/Relation/Action/ArtifactRef/Feedback model. This section documents the mapping.

### LongArc → Quest

`LongArc` represented a long-running pursuit or creation arc with a durable container for assets, decisions, and snapshots. In the new model, **Quest** is the clearer and more general concept: it carries intention, value, and long-term direction.

Quest is more precise than LongArc because it emphasises *why* something matters (the core question, the value anchor) rather than *that* something is long-running. A quest may span years; it may also be resolved in weeks. Duration is not the defining property — intention is.

Do not use LongArc in new code or documentation.

### CreationAsset → CreatorObject or ArtifactRef

`CreationAsset` was a broad container for assets associated with a LongArc.

In the new model:
- If the concept represents something being maintained and evolved over time → it is **CreatorObject**.
- If the concept represents a generated output or deliverable → it is **ArtifactRef**.

Do not use CreationAsset as a root concept in new code or documentation.

### DecisionRecord → FeedbackRecord or ArtifactRef

`DecisionRecord` captured important decisions that shaped a LongArc.

In the new model:
- If it records evaluation, consequence, or revision pressure → it is **FeedbackRecord**.
- If it records a reasoning artifact (a written decision document) → it is **ArtifactRef**.
- If a decision becomes a maintainable entity with evolving facets → it may be a **CreatorObject** with decision-related properties.

Do not use DecisionRecord as a separate root concept in new code or documentation.

### ProgressSnapshot → FeedbackRecord

`ProgressSnapshot` was a compressed point-in-time state of a LongArc.

Progress state is a form of feedback: it reflects the outcome of prior actions and the current evaluation of a quest or object. In the new model, this is absorbed into **FeedbackRecord** or future ObjectEvent.

Do not use ProgressSnapshot as a root concept in new code or documentation.

### ContextBrief → ArtifactRef or knowledge asset

`ContextBrief` was a compressed context package for a human or AI system.

In the new model:
- If generated as an output summary for handoff → it is **ArtifactRef**.
- If reused as soft reasoning context across multiple sessions → it belongs in `src/knowledge`.
- If attached to an object as a summary property → it is an Object property or facet.

Do not use ContextBrief as a root creation concept in new code or documentation.

### ArtifactRef → ArtifactRef (retained)

`ArtifactRef` is kept. It is aligned as part of the new model: the semantic reference to a produced output, anchored to the Quest, Object, and Action that motivated it.

## Relationship to Adjacent Layers

### runtime

`runtime` is the execution loop. It receives semantic work from creation-facing flows, dispatches steps to agents, runners, and connectors, and enforces governance. Creation does not call runtime directly; runtime is invoked by workflows and agents on behalf of creation intent.

### knowledge

`knowledge` owns callable soft knowledge: domain understanding, skills, principles, examples, checklists, and context briefs. Creation may consult knowledge when interpreting quests, objects, actions, and feedback, but creation does not own knowledge assets.

### agents

`agents` are role-based execution subjects. They may propose plans, summaries, evaluations, or context briefs. Creation stores accepted or relevant semantic records. Agents do not own the worldview.

### workflows

`workflows` define stable creator routines. One Quest may be advanced through many workflow runs. A `WorkflowRun` must not become the owner of long-term semantic state — that belongs in creation.

### connectors

`connectors` integrate external systems through `ConnectorPort`. `ArtifactRef` and `CreatorObject` may point to external locations, but the connection logic belongs in connectors.

### runners

`runners` execute work through tools. Runners may produce artifacts or summaries that are later registered under creation through `ArtifactRef`. Creation does not execute work.

### outputs

`outputs` creates or formats deliverables. Creation records what a produced artifact means inside a Quest through `ArtifactRef`. The formatting and delivery responsibility belongs in outputs.

### storage

`storage` persists creation records. Creation records should be compatible with future append-only event history. Do not mutate past records; prefer appending new feedback records, artifact refs, or object state updates.

## Personal-First and Collaboration-Compatible

v1 is personal-first. Records may include `ownerActorId` and `workspaceId` as lightweight string references where useful, but full collaboration features are out of scope. The design should not prevent future collaboration support, but should not depend on it.

## Open Questions

- Should Quest support sub-quests (quest hierarchy) from v1?
- Should CreatorObject support typed facet schemas, or remain open-property?
- Should CreationRelation be directional only, or support bidirectional patterns?
- When a FeedbackRecord targets a Quest, should it directly update Quest status, or should that be a separate operation?

## Future Evolution

- Automated language grounding: turning free-form input into structured Quest/Object/Action graphs
- Interface-oriented decomposition: objects expose accepted inputs, possible outputs, and available actions
- Sub-quest and sub-object hierarchies: layered approximation of complex pursuits
- ObjectEvent / EventLog: append-only event history for each CreatorObject, enabling time-travel and recovery
- Collaboration-specific records: shared quests, co-ownership, contribution history

## ChatGPT Handoff Context

`src/creation` is the worldview and methodological kernel of CreatorMesh. Core model: Quest (intention/pursuit) → CreatorObject (entity worth maintaining) → CreationRelation (how things connect) → CreatorAction (semantic next move) → ArtifactRef (produced output reference) → FeedbackRecord (evaluation/revision signal). No implementation yet. Design only. Does not execute tools; runtime and lower layers do. Old concepts (LongArc → Quest, CreationAsset → Object/ArtifactRef, DecisionRecord → Feedback/ArtifactRef, ProgressSnapshot → Feedback, ContextBrief → ArtifactRef/knowledge) are retired in the new model.
