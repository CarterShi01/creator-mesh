# Triggers

`src/triggers` is the interaction boundary of CreatorMesh. It receives internally generated thoughts, externally triggered messages, user actions, external events, and system signals, then represents them as stable input primitives for downstream creation, knowledge, workflow, and execution layers. It does not interpret user intent, construct creator objects, execute workflows, or call external systems.

This module was formed by merging `src/core` and `src/intake` into `src/triggers`. It now owns:

- The stable input domain primitives (`Thought`, `Message`)
- Factory functions that enforce input invariants (`createThought`, `createMessage`)
- Trigger signal types and normalized input types (to be added as the boundary expands)

## What belongs here

- Stable input domain primitives (Thought, Message)
- Factory functions for constructing and validating input primitives
- Trigger signal definitions (ThoughtTrigger, MessageTrigger, ScheduledTrigger, SystemEventTrigger)
- Input normalization types and lightweight helpers
- Trigger source abstractions (ThoughtSource, MessageSource, TriggerSource)

## What does not belong here

- Semantic interpretation or agent reasoning
- Agent reasoning logic
- Workflow execution
- Long-term knowledge modeling
- Storage implementation details
- Tool-specific integration code (connector or runner SDKs)
- Final output generation

## Role in the architecture

`triggers` is the entry point of the system. All inputs enter CreatorMesh through this layer.

It defines what a Thought is, what a Message is, and how they are created with enforced invariants. It does not decide what to do with them — that is the responsibility of `runtime` and `agents`.

## Zero-dependency invariant

`src/triggers` must not import from higher-level modules: `knowledge`, `workflows`, `runtime`, `agents`, `capabilities`, `governance`, or `storage`.

It may import from `src/shared` if strictly necessary. Ideally it remains self-contained.
