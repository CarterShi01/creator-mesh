# Design: src/core

## Current Design Summary

`core` is the zero-dependency foundation of CreatorMesh. It defines stable domain types and factory functions. Two primitives are implemented: `Thought` (internally generated input) and `Message` (externally triggered input). Both follow an identical structure — `id`, `content`, `createdAt`, `source` — and identical factory function contracts.

## Design Goals

- Define stable domain types that all other layers can depend on without risk of circular imports.
- Keep `core` free of business logic, tool-specific code, and side effects.
- Support future primitive expansion without breaking existing contracts.

## Key Decisions

- **Thought and Message mirror each other** at v1. This was deliberate: both primitives carry the same minimal metadata. They may diverge in future versions as domain requirements mature.
- **Factory functions over raw constructors**. `createThought()` and `createMessage()` enforce invariants (non-empty content, UUID generation, default timestamps) at the entry point.
- **`source` as extensible string literal union**. Starting with `"manual"` allows adding external sources later without a breaking type change.
- **`crypto.randomUUID()` for ID generation**. No external UUID library dependency in core.
- **No `DESIGN.md` was created for the Thought v1 implementation** — design was trivial and documented here retroactively for completeness.

## Tradeoffs

- Mirroring Thought and Message is simple now but may require divergence when Message gains fields like `sender`, `channel`, or `threadId`. The cost of divergence is a type change in `core`, which triggers cross-layer review.
- Using string literal union for `source` is flexible but requires discipline: new source values must be added to the union explicitly rather than being passed as free strings.

## Alternatives Considered

- **Single generic `Input` type for both Thought and Message** — rejected. Keeps the two primitives semantically distinct at the type level, which matters as agents and workflows may handle them differently.
- **Class-based types** — rejected. Plain interfaces are simpler, zero-overhead, and easier to serialize.

## Current Assumptions

- `Thought` and `Message` will remain the primary core input primitives throughout phase 1.
- All other layers that need to reference these types will import from `src/core`, not from each other.
- `core` will not grow to include business logic even as the system scales.

## Open Questions

- When `Message` gains fields like `sender`, `threadId`, or `channelType`, how much should Thought and Message contracts diverge before we split them into distinct type families?
- Should `Thought` ever carry a `tags` field or a `relatedTo` reference at the core level, or does that belong in `src/knowledge`?

## Future Evolution

- `ThoughtSource` and `MessageSource` will grow to include external source types (`"voice"`, `"notion"`, `"telegram"`, etc.) as connectors are added.
- Additional primitives (`CaptureItem`, `AgentTask`, `WorkflowRun`, `ApprovalRequest`, `OutputArtifact`) will be added to `core` as the layers that use them are designed.
- The zero-dependency invariant must be maintained as `core` grows.

## ChatGPT Handoff Context

`src/core` has two implemented types: `Thought` and `Message`. Both share an identical 4-field structure (id, content, createdAt, source). Factory functions validate and construct each. The zero-dependency invariant is enforced by a harness test. New primitives should be added to `core` only when they are truly layer-agnostic stable domain types, not when they are layer-specific models.
