# Design: src/triggers

## Current Design Summary

`src/triggers` is the interaction boundary of CreatorMesh. It was formed by merging `src/core` (stable domain primitives) and `src/intake` (input normalization concepts) into a single boundary layer. Two input primitives are implemented: `Thought` (internally generated input) and `Message` (externally triggered input). Both share an identical 4-field structure and identical factory function contracts.

The previous separation into core → triggers → intake was superseded by a cleaner product-level architecture where triggers IS the interaction boundary — it both defines stable primitives and represents input signals.

## Design Goals

- Own the stable input primitive definitions (Thought, Message) at the system boundary.
- Represent the four input/signal categories: thought, message, scheduled trigger, system event.
- Keep the boundary dependency-light: no imports from higher-level modules.
- Provide factory functions that enforce input invariants at the entry point.

## Key Decisions

- **Merged core + triggers + intake into triggers.** The original three-layer split (define types in core, signal envelope in triggers, normalize in intake) added indirection without product clarity. Under the new architecture, `triggers` is the full interaction boundary: it defines primitives, represents signals, and handles lightweight normalization.
- **Thought and Message remain mirrors at v1.** Both carry id, content, createdAt, source. They may diverge in future versions as Message gains fields like `sender`, `channel`, or `threadId`.
- **Factory functions over raw constructors.** `createThought()` and `createMessage()` enforce invariants (non-empty content, UUID generation, default timestamps) at the entry point.
- **`source` as extensible string literal union.** Starting with `"manual"` allows adding external sources later without a breaking type change.
- **`crypto.randomUUID()` for ID generation.** No external UUID library dependency.
- **Input-boundary invariant replaces core zero-dependency invariant.** The invariant is now expressed as: `src/triggers` must not import from higher-level modules. It may import from `src/shared` if needed.

## Tradeoffs

- Merging intake into triggers means normalization types will live in the same module as domain primitives. This is acceptable because intake had no implementation and normalization at this level is lightweight.
- Mirroring Thought and Message is simple now but may require divergence when Message gains additional fields. The cost of divergence triggers a contract review across modules that import from `src/triggers`.

## Alternatives Considered

- **Keep core as a separate zero-dependency layer** — superseded. The product architecture places triggers as the single interaction boundary. A separate core layer adds indirection that does not map to a clear product concept.
- **Keep intake as a separate normalization layer** — superseded. Intake had no implementation and its normalization responsibility is lightweight enough to live at the triggers boundary.
- **Single generic `Input` type for both Thought and Message** — rejected. Keeps the two primitives semantically distinct at the type level.
- **Class-based types** — rejected. Plain interfaces are simpler, zero-overhead, and easier to serialize.

## Current Assumptions

- `Thought` and `Message` will remain the primary input primitives throughout phase 1.
- All other layers that need to reference these types will import from `src/triggers`.
- `src/triggers` will not grow to include business logic, agent prompts, or tool-specific code.
- The first trigger signal types (ThoughtTrigger, MessageTrigger) will be added here as the boundary expands.

## Open Questions

- When `Message` gains fields like `sender`, `threadId`, or `channelType`, how much should Thought and Message contracts diverge?
- Should `Thought` ever carry a `tags` field or a `relatedTo` reference at the triggers level, or does that belong in `src/creation` or `src/knowledge`?
- How are triggers delivered to CreatorMesh — push (webhook/event), pull (polling), or direct function call?
- Should `ScheduledTrigger` carry a cron expression, a simple interval, or just a named schedule identifier?

## Future Evolution

- `ThoughtSource` and `MessageSource` will grow to include external source types (`"voice"`, `"notion"`, `"telegram"`, etc.) as connectors are added.
- Signal envelope types (ThoughtTrigger, MessageTrigger, ScheduledTrigger, SystemEventTrigger) will be added as the input boundary is fleshed out.
- Lightweight normalization helpers (source metadata extraction, text cleaning) will be added to `normalize.ts` if needed.

## ChatGPT Handoff Context

`src/triggers` owns Thought and Message input primitives. Both share a 4-field structure (id, content, createdAt, source). Factory functions validate and construct each. The input-boundary invariant prevents imports from higher-level modules. This module was formed by merging what were previously `src/core`, `src/triggers`, and `src/intake`. New input primitives and trigger signal types should be added here.
