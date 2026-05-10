# Creation

The `creation` directory owns the internal long-running creation domain state of CreatorMesh.

It manages durable creation arcs and their associated assets, decisions, artifact references, progress snapshots, and context briefs.

## What creation answers

- What long-running unit of work is being advanced?
- What assets belong to it?
- What decisions shaped it?
- What artifacts were produced?
- What is the current progress state?
- What context should be carried forward to humans or agents?

## What belongs here

- `LongArc` — a durable domain container for a long-running unit of work
- `CreationAsset` — a meaningful asset associated with a LongArc
- `DecisionRecord` — an important decision that shaped a LongArc
- `ArtifactRef` — a reference to a produced deliverable linked to a LongArc
- `ProgressSnapshot` — a compressed point-in-time state of a LongArc
- `ContextBrief` — a compressed context package for humans or AI systems

## What does not belong here

- Notes databases or raw knowledge item storage — that belongs in `src/knowledge`
- Workflow engine logic or step orchestration — that belongs in `src/workflows`
- Approval, audit, and governance policies — that belongs in `src/governance`
- Output formatting and write-back preparation — that belongs in `src/outputs`
- Connector adapters for Notion, Evernote, Obsidian, or any external tool — those belong in `src/connectors`
- Project management clones or task scheduling systems
- Collaboration platform features (v1 is personal-first)

## Role in the architecture

`creation` provides the internal domain home for long-running creation state.

Without this layer, durable creation state would scatter across `knowledge`, `workflows`, `governance`, `outputs`, and `orchestrator` — making it hard to track what a long-running unit of work is, what decisions shaped it, what artifacts it produced, and where it stands.

`creation` is a domain-layer preparation. v1 is personal-first. Future collaboration-compatible references may be added later without replacing this layer.
