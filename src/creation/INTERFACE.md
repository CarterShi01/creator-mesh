# Interface: src/creation

## Purpose

`creation` is the semantic kernel of CreatorMesh. It defines how the system understands and evolves what the creator is pursuing. It does not execute tools directly.

The core model is: **Quest → CreatorObject → CreationRelation → CreatorAction → ArtifactRef → FeedbackRecord**

## Public Concepts

### A. Quest

A Quest represents the core pursuit, long-term question, and value anchor behind a body of work. It is the reason objects and actions matter. A quest may span years or weeks; duration is not the defining property — intention is.

Examples: "How do I build CreatorMesh into a personal AI operating system?" · "How do I build a sustainable global career path?" · "How do I turn book reading into my own judgment system?" · "How do I evaluate and develop a startup idea?"

Quest is NOT a task, a ticket, a workflow step, a TODO, or a tool invocation.

*Replaces and retires: LongArc*

```
Quest {
  id: string
  title: string
  coreQuestion: string
  description?: string
  status: QuestStatus
  ownerActorId?: string
  workspaceId?: string
  createdAt: Date
  updatedAt: Date
  sourceRefs?: string[]
}

type QuestStatus = "active" | "paused" | "completed" | "archived"
```

### B. CreatorObject

A CreatorObject represents anything worth maintaining and evolving over time. It is a real-world or conceptual entity that CreatorMesh can understand, operate on, relate, and improve.

Examples: a project · a codebase · a book note system · a student · a customer · a career plan · a knowledge domain · a teaching curriculum · a startup idea · a decision · a reflection system · a workflow pattern

CreatorObject is NOT limited to files, notes, or project tasks.

*Replaces and retires: CreationAsset (when representing something being maintained)*

```
CreatorObject {
  id: string
  title: string
  objectType: string          // extensible: "project" | "knowledge-domain" | "person" | "plan" | "idea" | "system" | ...
  description?: string
  facets?: Record<string, unknown>
  questIds?: string[]
  properties?: Record<string, unknown>
  status: ObjectStatus
  ownerActorId?: string
  workspaceId?: string
  createdAt: Date
  updatedAt: Date
  sourceRefs?: string[]
}

type ObjectStatus = "active" | "paused" | "archived"
```

### C. CreationRelation

A CreationRelation represents how quests, objects, actions, artifacts, and feedback connect to each other. Relations turn CreatorMesh from a flat collection of notes and outputs into a semantic object network.

Relation types may include: `supports` · `depends_on` · `derived_from` · `generates` · `applies_to` · `conflicts_with` · `part_of` · `improves` · `reviews` · `implements`

```
CreationRelation {
  id: string
  from: string                // id of Quest | CreatorObject | CreatorAction | ArtifactRef
  to: string                  // id of Quest | CreatorObject | CreatorAction | ArtifactRef
  type: string                // relation type string; extensible
  description?: string
  createdAt: Date
  updatedAt: Date
}
```

### D. CreatorAction

A CreatorAction represents the next meaningful semantic move: a user-level intention to evaluate, summarize, plan, compare, generate, review, or refactor.

Examples: "evaluate this idea" · "summarize this book" · "generate a lesson plan" · "compare these career routes" · "create a project plan" · "review this artifact" · "refactor this code"

CreatorAction is NOT the same as `ConnectorAction` or `RunnerAction`. Those are low-level execution requests. Creation Action is a semantic user-level move that may later be executed through runtime, agents, workflows, runners, or connectors.

*Replaces and retires: parts of CreationAsset where the concept represents an executable intention*

```
CreatorAction {
  id: string
  title: string
  target: string              // id of Quest | CreatorObject | ArtifactRef being acted upon
  questId?: string
  objectId?: string
  actionType: string          // extensible: "evaluate" | "summarize" | "plan" | "compare" | "generate" | "review" | ...
  expectedOutput?: string
  status: ActionStatus
  createdAt: Date
  updatedAt: Date
}

type ActionStatus = "proposed" | "accepted" | "in_progress" | "completed" | "rejected"
```

### E. ArtifactRef

An ArtifactRef represents the semantic reference to a produced output. It is not the storage implementation itself — `outputs` creates and formats artifacts; creation contextualises them within the quest and object network.

Examples: design document · code diff · PR · lesson plan · PDF · markdown document · Notion page · route comparison table · generated prompt · report · email draft

Artifact types include: `notion_page` · `markdown` · `docx` · `pdf` · `github_pr` · `github_commit` · `code_branch` · `deployed_url` · `image` · `dataset` · `report` · `learning_plan` · `legal_analysis` · `prompt`. Extensible.

*Retained from earlier model; aligned to new Quest/Object/Action context*

*Also absorbs: ContextBrief when used as a generated output for handoff; DecisionRecord when the decision is a recorded artifact*

```
ArtifactRef {
  id: string
  title: string
  artifactType: string
  sourceActionId?: string
  sourceObjectId?: string
  questId?: string
  uri?: string                // stable reference to artifact location
  producedBy?: string         // actorId or runnerId reference
  reviewStatus?: ArtifactReviewStatus
  createdAt: Date
  updatedAt: Date
}

type ArtifactReviewStatus = "pending" | "accepted" | "needs_changes" | "superseded" | "archived"
```

### F. FeedbackRecord

A FeedbackRecord represents reflection, evaluation, real-world outcome, or revision signal. Feedback is what makes CreatorMesh evolve instead of only generate. Feedback updates quests, objects, actions, future workflows, and knowledge assets.

Examples: "this artifact was useful" · "this result needs changes" · "this plan failed" · "this route became more promising" · "this workflow should become reusable" · "this object state should be updated"

*Replaces and retires: ProgressSnapshot (progress as state evaluation) · DecisionRecord (when recording evaluation or revision pressure)*

```
FeedbackRecord {
  id: string
  target: string              // id of Quest | CreatorObject | CreatorAction | ArtifactRef
  targetType: string          // "quest" | "object" | "action" | "artifact"
  rating?: string             // extensible: "useful" | "needs_changes" | "failed" | "promising" | ...
  comment?: string
  outcome?: string
  suggestedChange?: string
  givenBy?: string            // actorId or agentId
  createdAt: Date
}
```

### G. Future collaboration placeholder

Future versions may introduce contribution and collaboration-specific records (shared quests, co-ownership, invitation, review threads). These are intentionally out of scope for v1 and are not defined in this interface.

## Allowed Dependencies

- `src/shared`
- `src/storage` (for persistence of creation records)

## Disallowed Dependencies

- `src/triggers` (creation receives already-interpreted intent, not raw input)
- `src/runtime`
- `src/knowledge`
- `src/agents`
- `src/runners`
- `src/connectors`
- `src/workflows`
- `src/governance`
- `src/outputs`

## Invariants

- `creation` must remain tool-agnostic. It must not contain Notion, Evernote, Obsidian, or other tool-specific logic.
- `creation` must not execute work, run agents, or call external APIs directly.
- `creation` must not own the LLM loop, session state, or runtime execution context.
- Quest is the durable owner of long-running pursuit state. It must not be stored in `workflows`, `governance`, `outputs`, or `runtime`.
- Creation records should be compatible with future append-only event history. Prefer appending new feedback records or artifact refs over mutating past records.

## Retired Concepts

The following concepts from the earlier creation model are retired. They should not be used in new code. See `DESIGN.md — Legacy Concept Consolidation` for full mapping rationale.

| Retired concept | Replaced by |
|----------------|-------------|
| `LongArc` | `Quest` |
| `CreationAsset` | `CreatorObject` or `ArtifactRef` |
| `DecisionRecord` | `FeedbackRecord` or `ArtifactRef` |
| `ProgressSnapshot` | `FeedbackRecord` |
| `ContextBrief` | `ArtifactRef` (if generated output) or `src/knowledge` asset |

## Main Files

No implementation files exist yet.

Planned initial files:
- `types.ts` — Quest, CreatorObject, CreationRelation, CreatorAction, ArtifactRef, FeedbackRecord types
- `index.ts` — barrel re-exports

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `src/creation/README.md`.
4. Read this `INTERFACE.md`.
5. Read `src/creation/DESIGN.md` if design reasoning is needed.
6. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
7. Update this file if the public contract changes.
8. Apply bottom-up propagation: if core types change, check whether `src/storage/INTERFACE.md` needs updates.
