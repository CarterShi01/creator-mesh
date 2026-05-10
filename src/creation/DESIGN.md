# Design: src/creation

## Current Design Summary

`creation` is the internal domain layer for long-running creation state. It owns durable creation arcs (`LongArc`) and associated domain records: assets, decisions, artifact references, progress snapshots, and context briefs. No implementation files exist yet. This document captures the design intent and boundary rationale.

## Why creation is needed

The existing architecture has `Thought` and `Message` as core primitives. Those primitives capture inputs, but they do not represent durable long-running creation state. A durable domain container is needed for work that spans many thoughts, messages, workflow runs, outputs, and tool interactions — such as a product idea, a research topic, a learning path, a legal case, or a book project.

Without a dedicated creation layer, this state would scatter across `knowledge`, `workflows`, `governance`, `outputs`, or `orchestrator`, making each of those layers too broad and the system harder to reason about.

## Why not put this in knowledge

`knowledge` owns structured knowledge assets such as notes, concepts, references, insights, summaries, questions, and source material. A `LongArc` may contain or reference knowledge, but it also has decisions, artifacts, progress state, and context continuity that are not knowledge items. Putting `LongArc` into `knowledge` would make `knowledge` too broad and blur the boundary between "what was learned" and "what is being built."

## Why not put this in workflows

`workflows` defines how something is advanced — step definitions, connectors, runners, input/output mapping. A `LongArc` is *what* is being advanced, not *how*. One `LongArc` may have many workflow runs: capture, planning, review, research, implementation, sync, artifact registration, and context brief generation. `WorkflowRun` must not become the owner of long-term domain state.

## Why not put this in governance

`governance` owns approval, access, risk, and audit. It is the control and safety layer. `creation` owns durable domain memory — what the work is, what decisions shaped it, what was produced. Making `governance` the owner of `LongArc` state or artifact history would conflate domain memory with access control.

## Relationship to outputs

`outputs` formats deliverables: Markdown, docx, pptx, PDF, code patches, reviewable plans, or write-back payloads. `creation` records what a produced artifact means inside a `LongArc` through `ArtifactRef`. `outputs` creates or formats artifacts; `creation` contextualizes them within the long-running arc.

## Relationship to connectors

`connectors` integrate external systems through `ConnectorPort` and `CapabilityRegistry`. `creation` must not call provider APIs directly. `CreationAsset` and `ArtifactRef` may point to external locations through stable references, but the connection logic belongs in connectors.

## Relationship to runners

`runners` execute work through tools such as Claude Code, document generators, browser agents, or future execution backends. `creation` does not execute work. Runners may produce artifacts or summaries that are later registered under `creation` through `ArtifactRef`.

## Relationship to agents

`agents` reason and propose. They may propose plans, reviews, decisions, summaries, learning paths, research outlines, or context briefs. `creation` stores accepted or relevant domain records. Agents should not own durable project state — state belongs in `creation` and `storage`.

## Relationship to orchestrator

`orchestrator` coordinates. It routes between intake, creation, agents, workflows, governance, runners, connectors, outputs, and storage. It must not own creation semantics or hold `LongArc` state. When a flow produces a new decision or artifact, it is the orchestrator's job to ensure the right creation records are written — but the records belong in `creation`.

## Personal-first and collaboration-compatible

v1 is personal-first. Records include `ownerActorId` and `workspaceId` as lightweight string references where useful, but full collaboration features — workspace membership, team roles, invitation, comments, review threads — are out of scope. The design should not prevent future collaboration support, but it should not depend on it either.

## Long-term state

Creation records should be compatible with future append-only event history and snapshots. Do not implement event sourcing now. `src/storage` may later provide `EventLog` and `SnapshotStore` support. When that happens, creation records should be able to participate without structural changes.

## Future-only note

Future versions may introduce collaboration-specific records or a dedicated collaboration module. These are intentionally not part of the current public design.

## Core principle

CreatorMesh should avoid scattering long-running domain state across `knowledge`, `workflows`, `governance`, `outputs`, or `orchestrator`. `creation` provides the internal home for that state.
