# Project Structure

This document explains the main source directories of CreatorMesh.

## `src/triggers`

The interaction boundary of CreatorMesh.

This directory owns stable input primitives (Thought, Message), factory functions, trigger signal types, and input normalization. It is the single entry point for all inputs into the system. Formed by merging the former `src/core`, `src/triggers`, and `src/intake` directories.

## `src/creation`

Long-running creation domain state.

This directory owns LongArc, CreationAsset, DecisionRecord, ArtifactRef, ProgressSnapshot, and ContextBrief — durable records that track what a unit of creative work is over time.

## `src/knowledge`

Structured knowledge objects such as thoughts, notes, ideas, plans, reflections, and mind-map-ready structures.

This directory manages knowledge as a tool-agnostic internal layer.

## `src/orchestrator`

Coordination, routing, state transitions, and approval checkpoints.

This directory decides how work moves through the system.

## `src/agents`

Agent role definitions, instructions, capabilities, and input/output contracts.

This directory defines who reasons about what.

## `src/runners`

Execution adapters for systems such as Claude Code, Codex, OpenHands, Aider, local scripts, or human execution.

This directory lets CreatorMesh execute tasks without binding the system to one execution engine.

## `src/connectors`

External tool integrations such as Notion, GitHub, Email, Calendar, and other knowledge systems.

This directory keeps external tool integration separate from the core architecture.

## `src/workflows`

End-to-end transformations from inputs to outputs.

This directory defines stable, creator-approved workflows such as thought-to-note, message-to-action, and idea-to-project.

## `src/governance`

Approval, permissions, audit, budget, risk, and safety policies.

This directory keeps the system controllable and human-in-the-loop.

## `src/storage`

Persistence abstractions and storage adapters.

This directory stores workflow state, knowledge references, approvals, and agent run records.

## `src/outputs`

Output formatting, artifact generation, and write-back preparation.

This directory prepares final results for the creator or connected tools.

## `src/shared`

Small reusable utilities shared across multiple layers.

This directory should stay small and should not become a dumping ground for unclear code.
