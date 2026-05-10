# Interface: src/creation

## Purpose

`creation` manages durable long-running creation domain state. It provides the internal home for `LongArc` records and their associated assets, decisions, artifact references, progress snapshots, and context briefs.

## Public Concepts

### A. LongArc

A durable long-running domain container. It represents a meaningful unit of work that spans many thoughts, messages, workflow runs, and tool interactions over time.

Examples: product idea, research topic, learning path, book notes, career plan, legal research, thesis, software project.

```
LongArc {
  id: string
  title: string
  description: string
  purpose: string
  status: LongArcStatus
  horizon: LongArcHorizon
  ownerActorId: string        // lightweight reference; full identity system is out of scope for v1
  workspaceId?: string        // optional; for future workspace-compatible records
  createdAt: Date
  updatedAt: Date
  sourceRefs?: string[]       // stable references to source inputs (Thought id, Message id, etc.)
}

type LongArcStatus = "active" | "paused" | "completed" | "archived"

type LongArcHorizon = "short" | "medium" | "long" | "lifelong"
```

### B. CreationAsset

A meaningful asset inside a `LongArc`. It may reference content stored locally or in external systems.

Asset types include: `idea`, `note`, `question`, `insight`, `reference`, `plan`, `decision`, `artifact`, `review`, `task`, `context_brief`, `progress_snapshot`. This list is extensible.

```
CreationAsset {
  id: string
  longArcId: string
  type: string                // extensible asset type string
  title: string
  contentRef?: string         // stable reference to content location (local path, external URL, etc.)
  sourceRefs?: string[]
  createdBy?: string          // actorId reference
  createdAt: Date
  updatedAt: Date
  status: "active" | "archived"
}
```

### C. DecisionRecord

A record of an important decision that shaped a `LongArc`. Decisions may supersede earlier decisions.

```
DecisionRecord {
  id: string
  longArcId: string
  title: string
  summary: string
  rationale?: string
  alternatives?: string[]
  decidedBy?: string          // actorId reference
  decidedAt: Date
  sourceRefs?: string[]
  supersedesDecisionIds?: string[]
  status: DecisionStatus
}

type DecisionStatus = "proposed" | "accepted" | "rejected" | "superseded"
```

### D. ArtifactRef

A reference to a produced deliverable or intermediate output associated with a `LongArc`. `creation` records the meaning of an artifact inside a LongArc; `outputs` is responsible for creating or formatting the artifact itself.

Artifact types include: `notion_page`, `evernote_note`, `markdown`, `docx`, `pdf`, `pptx`, `github_pr`, `github_commit`, `code_branch`, `deployed_url`, `image`, `dataset`, `report`, `learning_plan`, `legal_analysis`, `thesis_chapter`. This list is extensible.

```
ArtifactRef {
  id: string
  longArcId: string
  type: string                // extensible artifact type string
  title: string
  location?: string           // stable reference to artifact location
  producedBy?: string         // actorId or runnerId reference
  producedAt: Date
  sourceRefs?: string[]
  status: "active" | "superseded" | "archived"
}
```

### E. ProgressSnapshot

A compressed state of a `LongArc` at a point in time. Snapshots are intended to be generated periodically or on demand, not updated in place.

```
ProgressSnapshot {
  id: string
  longArcId: string
  currentGoal?: string
  currentStatus?: string
  keyDecisions?: string[]
  openQuestions?: string[]
  activeTasks?: string[]
  recentArtifacts?: string[]  // ArtifactRef ids
  nextActions?: string[]
  blockers?: string[]
  generatedAt: Date
  generatedBy?: string        // actorId or agentId reference
}
```

### F. ContextBrief

A compressed context package prepared for a human or AI system. Used to hand off understanding of a `LongArc` without requiring the recipient to read the full record history.

Target audience examples: `human`, `chatgpt`, `claude_code`, `codex`, `runner`, `collaborator`.

Compression level examples: `light`, `balanced`, `dense`.

```
ContextBrief {
  id: string
  longArcId: string
  targetAudience: string
  compressionLevel: string
  includedAssetIds?: string[]
  summary: string
  generatedAt: Date
  generatedBy?: string        // actorId or agentId reference
}
```

### G. Future collaboration placeholder

Future versions may introduce contribution and collaboration-specific records. These are intentionally out of scope for v1 and are not defined in this interface.

## Allowed Dependencies

- `src/core`
- `src/shared`
- `src/storage` (for persistence of creation records)

## Disallowed Dependencies

- `src/triggers`
- `src/intake`
- `src/knowledge`
- `src/orchestrator`
- `src/agents`
- `src/runners`
- `src/connectors` (external tool calls belong in connectors, not in the domain layer)
- `src/workflows`
- `src/governance`
- `src/outputs`

## Invariants

- `creation` must remain tool-agnostic. It must not contain Notion, Evernote, Obsidian, or other tool-specific logic.
- `creation` must not execute work, run agents, or call external APIs directly.
- `LongArc` is the durable owner of long-running domain state. It must not be stored in `workflows`, `governance`, `outputs`, or `orchestrator`.
- Creation records should be compatible with future append-only event history. Do not mutate past records; prefer appending new snapshots or decision records.

## Main Files

No implementation files are defined yet.

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `src/creation/README.md`.
4. Read this `INTERFACE.md`.
5. Read `src/creation/DESIGN.md` if design reasoning is needed.
6. Identify whether the change affects public concepts, inputs, outputs, dependencies, or invariants.
7. Update this file if the public contract changes.
8. Apply bottom-up propagation: if `LongArc` or related types change, check whether `src/orchestrator/INTERFACE.md` or `src/storage/INTERFACE.md` need updates.
