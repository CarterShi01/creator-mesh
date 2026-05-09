# Project Structure

This document explains the main source directories of CreatorMesh.

## `src/core`

Stable domain primitives and interfaces.

This directory defines the basic objects of CreatorMesh, such as thoughts, messages, triggers, workflow runs, approval requests, and output artifacts.

## `src/triggers`

Input entry points such as thoughts, messages, scheduled triggers, and system events.

This directory represents the first signal that something should happen.

## `src/intake`

Normalization and lightweight classification of raw inputs.

This directory converts messy real-world input into internal capture items.

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

External tool integrations such as Notion, GitHub, OpenClaw, Email, Calendar, XMind, browser tools, and file systems.

This directory keeps external tool integration separate from the core architecture.

## `src/workflows`

End-to-end transformations from inputs to outputs.

This directory defines use-case-level flows such as thought-to-note, message-to-action, idea-to-project, or cognitive tree maintenance.

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
