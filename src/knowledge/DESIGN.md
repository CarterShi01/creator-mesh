# Design: src/knowledge

## Current Design Summary

`knowledge` turns captured inputs into structured personal knowledge assets. It is the layer where a raw normalized input becomes a titled, tagged, linkable knowledge item. The layer is tool-agnostic — it does not contain Notion API calls or any external tool logic. No implementation files exist yet.

## Design Goals

- Define a tool-agnostic knowledge model that can be persisted locally or synced to external tools via connectors.
- Support the core knowledge asset types: StructuredThought, Note, Idea, Plan, Reflection.
- Allow knowledge items to be linked, organized into trees, and revisited over time.

## Key Decisions

- **Tool-agnostic model**: knowledge types are defined independently of Notion, XMind, or any other tool. Connectors translate between the internal model and external formats.
- **Knowledge types as subtypes**: `StructuredThought`, `Note`, `Idea`, `Plan` are distinct types, not generic tagged records. This supports agent role specialization and type-safe routing.
- **`KnowledgeRelationship` for links**: typed links between knowledge items (e.g., `"supports"`, `"contradicts"`, `"is-part-of"`) allow a knowledge graph to emerge over time.
- **`knowledge` can read from `storage` but not from connectors**: external reads happen through workflows or orchestrator, not directly from the knowledge layer.

## Tradeoffs

- Defining many specific knowledge types (StructuredThought, Note, Idea, Plan) is semantically rich but adds surface area to maintain. A single `KnowledgeItem` with a `kind` field would be simpler to start.
- Allowing `knowledge` to depend on `storage` means it has a persistence concern. The alternative — making the orchestrator manage all persistence — would push too much logic out of the layer that owns the knowledge model.

## Alternatives Considered

- **Generic `KnowledgeItem` with a `kind` discriminator** — considered. Rejected in favor of distinct types because agents and workflows are expected to specialize by knowledge type.
- **Put knowledge structuring inside agents** — rejected. Knowledge modeling should be stable and reusable. Agents reason about knowledge items; they do not define the knowledge model itself.

## Current Assumptions

- Notion is the first planned external knowledge tool, but the internal model must be designed before Notion mapping is considered.
- The first implementation target is `StructuredThought` — a thought processed into a titled, structured note.
- Knowledge items are identified by UUID and may carry tags, a creation timestamp, and links to other items.

## Open Questions

- Should `Plan` be a knowledge item or an orchestrator concept? Plans have steps and execution state, which feels closer to workflow than knowledge.
- How is the knowledge tree visualized or navigated — is that an output concern, a connector concern, or a knowledge-layer concept?
- What triggers knowledge re-evaluation (e.g., idea revival, cognitive tree maintenance) — scheduled trigger, user command, or a background agent?

## Future Evolution

- `KnowledgeTree` and `ReflectionSummary` will be added when cognitive tree maintenance and weekly review workflows are designed.
- A `KnowledgeIndex` or semantic search capability may emerge when the knowledge base grows large enough.
- Notion connector mapping will be designed separately once the internal model is stable.

## ChatGPT Handoff Context

`src/knowledge` has no implementation yet. Design intent: tool-agnostic structured knowledge assets (StructuredThought, Note, Idea, Plan, Reflection) produced from `CaptureItem`. Links between items via `KnowledgeRelationship`. Can read/write via `src/storage`. Must not call Notion or any connector directly — external sync happens through `src/connectors` in workflow context. First implementation target: `StructuredThought` from a processed `Thought` input.
