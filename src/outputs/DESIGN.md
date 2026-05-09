# Design: src/outputs

## Current Design Summary

`outputs` is the final layer before results reach the creator or an external tool. It formats artifacts (structured notes, plans, reports) and prepares write-back payloads for connectors. It does not make routing decisions or trigger new flows. No implementation files exist yet.

## Design Goals

- Separate output formatting from output delivery: formatting produces a `FormattedOutput`; delivery sends a `WriteBackPayload` to a connector.
- Produce artifacts that are human-readable first and tool-writable second.
- Ensure outputs do not start new flows or write to storage.

## Key Decisions

- **Formatting and delivery are distinct concerns**: an `OutputArtifact` is formatted into a `FormattedOutput` (Markdown, JSON, plain text). Separately, a `WriteBackPayload` is prepared for a connector to deliver to an external tool.
- **`outputs` depends on `src/connectors` for write-back**: this is the only cross-layer dependency beyond `core` and `shared`. Output delivery uses the connector adapter, not a direct API call.
- **`outputs` does not store**: persistence belongs in `src/storage`. After delivery, outputs layer is done.
- **`outputs` does not trigger follow-up flows**: if an output triggers a new workflow (e.g., a shipped note triggers a review), that is the orchestrator's responsibility, not outputs.

## Tradeoffs

- Allowing `outputs` to depend on `src/connectors` means outputs is aware of external tools. This is a deliberate tradeoff: the alternative (passing write-back responsibility to the caller) would push formatting logic out of the layer that owns it.
- Supporting multiple output formats (Markdown, JSON, plain text, mind-map outline) adds complexity. Starting with Markdown only simplifies v1.

## Alternatives Considered

- **Merge outputs into workflows** — rejected. Output formatting is a distinct concern from workflow logic. Mixing them would make both harder to test and extend.
- **Outputs call external APIs directly** — rejected. External API calls belong in connectors, not in the output formatting layer.

## Current Assumptions

- The first output format will be Markdown — human-readable structured notes.
- The first write-back target will be a Notion page (via NotionConnector), once the connector is implemented.
- Output artifacts are ephemeral — they are not stored in `src/storage` after delivery.

## Open Questions

- How is the `DeliveryTarget` specified — by the workflow, by the creator at runtime, or by a pre-configured routing rule?
- Should output artifacts be cached temporarily if delivery fails, or should the workflow re-generate them on retry?
- For the creator-facing view, what is the presentation surface — CLI output, a local HTML file, a notification?

## Future Evolution

- Additional output formats: JSON, YAML, mind-map outline (XMind-compatible), GitHub issue body, email draft.
- A multi-target delivery model where one artifact is delivered to multiple destinations simultaneously.
- Templating may emerge as creators want consistent formatting for specific output types.

## ChatGPT Handoff Context

`src/outputs` has no implementation yet. Design intent: format `WorkflowOutput` or `KnowledgeItem` into `FormattedOutput` (Markdown first), prepare `WriteBackPayload` for connectors. Depends on `src/connectors` for delivery. Does not store, does not trigger new flows, does not call external APIs directly. First target: format a `StructuredThought` as Markdown and deliver to a Notion page via connector.
