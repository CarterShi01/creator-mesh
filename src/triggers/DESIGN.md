# Design: src/triggers

## Current Design Summary

`triggers` is the input entry layer — the first point where something tells CreatorMesh that an event has occurred. It represents signals without performing normalization or reasoning. No implementation files exist yet. The design direction is a thin, typed envelope that wraps raw input before handing off to `src/intake`.

## Design Goals

- Represent the four trigger categories (thought, message, scheduled, system event) as typed signals.
- Keep trigger handling thin: receive or represent the signal, then hand off.
- Remain agnostic to how the signal was generated (CLI, API, webhook, cron job).

## Key Decisions

- **Triggers are representations, not handlers**. They carry the initial signal; they do not normalize, reason, or store.
- **`TriggerPayload` as the handoff envelope**. All trigger types are wrapped in a common envelope before being passed to `intake`. This decouples the trigger type from the intake normalization logic.
- **Four trigger categories at v1**: ThoughtTrigger, MessageTrigger, ScheduledTrigger, SystemEventTrigger.

## Tradeoffs

- A single `TriggerPayload` envelope simplifies the `intake` contract at the cost of a discriminated union — `intake` must inspect the payload type to normalize correctly.
- Keeping triggers thin means some context (e.g., channel metadata for a Telegram message) must be carried in the payload, not derived.

## Alternatives Considered

- **Separate intake entry points per trigger type** — rejected. Would couple intake to every trigger variant and require more conditional logic downstream.
- **Triggers calling intake directly** — rejected. Violates the layer boundary; triggers must not call downstream layers.

## Current Assumptions

- The first trigger to implement will be a `ThoughtTrigger` from a manual creator entry (CLI or API).
- Scheduled triggers will initially be stub implementations only.
- System event triggers are not needed until the workflow layer is built.

## Open Questions

- How are triggers delivered to CreatorMesh — push (webhook/event), pull (polling), or direct function call? This affects whether `triggers` needs an event listener pattern or can remain purely functional.
- Should `ScheduledTrigger` carry a `cron` expression, a simple interval, or just a named schedule identifier?
- How should triggers represent priority or urgency (e.g., a critical message vs. a background review)?

## Future Evolution

- As connectors are added (Notion, Telegram, email), new trigger adapters will appear that translate external signals into the canonical `TriggerPayload`.
- A trigger registry or dispatcher may emerge if the number of trigger sources grows.

## ChatGPT Handoff Context

`src/triggers` has no implementation yet. Design intent: thin typed wrappers for four signal categories (thought, message, scheduled, system). All wrap into `TriggerPayload` before handoff to `src/intake`. Triggers must not normalize or reason — they only represent the initial signal. First implementation target: `ThoughtTrigger` from manual creator entry.
