# Design: src/intake

## Current Design Summary

`intake` normalizes raw trigger payloads into consistent `CaptureItem` records. It is the bridge between messy real-world input and CreatorMesh's internal models. No implementation files exist yet. The design direction is a stateless normalization pipeline: clean the text, extract source metadata, classify the input type, and produce a uniform `CaptureItem`.

## Design Goals

- Produce a consistent `CaptureItem` regardless of whether the input arrived from a manual entry, a webhook, an email, or a scheduled trigger.
- Keep normalization lightweight — intake is not reasoning or storage.
- Ensure downstream layers (knowledge, orchestrator) never need to handle raw, messy input.

## Key Decisions

- **Stateless normalization**: intake does not write to storage or maintain session state. Each `TriggerPayload` in produces one `CaptureItem` out.
- **Source metadata is extracted here**: channel, origin system, timestamp normalization, and detected language are captured at this layer and attached to `CaptureItem`.
- **Classification is shallow**: intake may label an input as "thought-like" or "message-like", but deep semantic classification belongs in agents or knowledge.

## Tradeoffs

- Doing classification in intake (shallow) vs. deferring entirely to the orchestrator: shallow classification allows faster routing decisions but risks mislabeling edge cases.
- Normalization that is too aggressive (e.g., heavy text cleaning) can strip context that later layers might need. Intake should preserve original content alongside the normalized form.

## Alternatives Considered

- **Merge intake into triggers** — rejected. Triggers represent signals; intake normalizes them. Merging would couple signal representation to normalization logic.
- **Merge intake into knowledge** — rejected. Knowledge structures meaning; intake only normalizes form. Merging would conflate the concerns.

## Current Assumptions

- The first `CaptureItem` will be produced from a `ThoughtTrigger` with manually entered text.
- Language detection is a future concern; the first implementation can assume a single language.
- Intake does not call external APIs. Any enrichment that requires an external call happens in agents or connectors.

## Open Questions

- Should `CaptureItem` carry the original raw content alongside the normalized content, or only the normalized form?
- How much should intake do for deduplication — should it detect near-duplicate inputs, or defer to the knowledge layer?
- What is the failure behavior when a `TriggerPayload` cannot be normalized (malformed, empty, unsupported type)?

## Future Evolution

- As more trigger types are added (email, Telegram, Notion webhook), intake will grow a normalization handler per source type.
- A plugin or adapter model may emerge to allow normalization strategies to be swapped without changing the core intake flow.

## ChatGPT Handoff Context

`src/intake` has no implementation yet. Design intent: stateless normalization of `TriggerPayload` → `CaptureItem`. Extracts source metadata, does shallow classification, cleans text. Does not call APIs, does not write to storage. Output (`CaptureItem`) is passed to `src/orchestrator` or directly to `src/knowledge`. First implementation target: normalize a `ThoughtTrigger` with manual text input.
