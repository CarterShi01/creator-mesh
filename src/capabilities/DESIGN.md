# Design: src/capabilities

## Current Design Summary

`capabilities` is the callable capability layer of CreatorMesh. It groups physical and provider-backed execution capabilities under a single parent module. `runtime` and `agents` invoke capabilities through port interfaces. Capabilities do not own the CreatorMesh worldview, the LLM loop, session/context state, or semantic creation concepts.

This module was created by consolidating `src/runners` and `src/connectors` (previously top-level modules) under a unified capability grouping, and adding a `models` scaffold for future model-provider capabilities.

## Design Goals

- Group all callable physical/provider capabilities under one module.
- Keep port interfaces stable across submodules (`RunnerPort`, `ConnectorPort`).
- Isolate provider SDK dependencies inside adapter implementations, not in port definitions.
- Leave `models` as intentional scaffold — do not implement inference capabilities prematurely.
- Preserve all existing runner and connector behavior.

## Submodule Summary

### runners

Execution environment adapters. `RunnerPort` is the stable interface. Adapters include `ClaudeCodeRunnerAdapter` (subprocess invocation). `RunnerRegistry` declares capabilities per runner. Governance-checked before execution when side effects are possible.

### connectors

External system integrations. `ConnectorPort` is the stable interface. `CapabilityRegistry` declares standard capabilities (read, search, create, update, append, delete, sync, subscribe, execute) with permission levels and approval requirements. `NotionConnectorAdapter` is the first reference implementation.

### models

Intentionally scaffold-only. Reserved for future model-provider and inference capabilities (Claude, GPT, Gemini, local LLMs, embedding models, rerankers, vision models). No implementation in this version.

## Architecture Boundary

- `runtime` invokes capabilities through port interfaces. Runtime must not import provider SDK types directly.
- `agents` request capabilities through runtime — agents do not call capability ports directly.
- `governance` is invoked by `runtime` before side-effecting capability execution.
- `creation` must not depend on `capabilities`. Creation owns semantic intent; capabilities execute it.
- Provider SDKs (`@notionhq/client`, future OpenAI/Anthropic SDKs for model inference) are isolated inside capability adapter files.
- `capabilities` must not import from `runtime` — this would create a circular dependency.

## Key Decisions

- **Namespace-grouped export**: `src/capabilities/index.ts` uses `export * as runners / connectors / models` to avoid type name collisions between submodules (both `runners` and `connectors` export `ApprovalRequirement` and `ApprovalResult`).
- **models is scaffold only**: The `models` directory exists to document intent and reserve the module namespace. It does not implement any inference logic. Current model usage (e.g., `AnthropicThoughtClient` in `src/agents/`) remains where it is — model capability abstraction is a future concern.
- **No behavior changes**: This is a structural reorganization. All port contracts, adapter behavior, error taxonomy, and tests are preserved.

## Deferred / Not Yet Implemented

- **ModelProviderPort**: a stable interface for chat, embedding, and inference model providers
- **Model adapters**: Claude, GPT, Gemini, local LLM, embedding, reranker, vision adapters
- **Token accounting and cost tracking**
- **Streaming model output handling**
- **Tool-call abstraction layer for model providers**
- **MCP server connector adapters** (beyond direct API adapters)
- **Integration hub adapters** (community connectors, long-tail SaaS)

## Open Questions

- Should `models` export a stub `ModelProviderPort` interface, or remain completely empty until implementation begins?
- Should runner capability queries eventually go through a `CapabilityRegistry` pattern similar to `ConnectorPort`?
- Should `capabilities/index.ts` eventually re-export flat types (not namespaced) for the most-used port types?

## ChatGPT Handoff Context

`src/capabilities` groups callable physical/provider capabilities: `runners` (execution environments), `connectors` (external integrations), `models` (scaffold only — future inference). Port interfaces: `RunnerPort`, `ConnectorPort`. Invoked by `runtime` and `agents` through port interfaces. Does not own worldview, LLM loop, or creation semantics. Provider SDKs isolated inside adapter implementations.
