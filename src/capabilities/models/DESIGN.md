# Design: src/capabilities/models

## Current Design Summary

`models` is a scaffold-only module. It reserves the namespace for future model-provider and inference capabilities. No implementation exists. No implementation should be added until this phase is explicitly started.

## Why this module exists

As CreatorMesh grows, model providers (Claude, GPT, Gemini, local LLMs, embedding models) will need a stable port interface so that:
- `runtime` and `agents` can invoke model calls without depending on provider SDK types
- Provider SDKs can be swapped without affecting callers
- Token accounting, cost control, and governance can be applied consistently

This mirrors how `RunnerPort` abstracts execution environments and `ConnectorPort` abstracts external integrations.

## Deferred / Not Yet Implemented

**Do not implement any of the following in this phase:**

- `ModelProviderPort` — stable interface for chat/embedding/inference
- Chat model adapters: Claude, GPT, Gemini, Mistral, local LLMs
- Embedding model adapters: OpenAI embeddings, Cohere, local sentence-transformers
- Reranker model adapters
- Vision model adapters
- Model registry and capability declarations
- Token accounting and cost tracking
- Streaming model output handling
- Tool-call abstraction layer for model providers
- Context window management

## Current model usage

Current model usage (e.g., `AnthropicThoughtClient` calling the Anthropic SDK inside `src/agents/thought-agent.ts`) remains where it already is. It is not moved here in this phase.

When `ModelProviderPort` is defined, the Anthropic SDK call can be extracted into a `ClaudeModelAdapter` here, and `ThoughtAgent` would accept a `ModelProviderPort` injection. That migration is a future task.

## Architecture Boundary

- `models` will not import from `src/runtime`, `src/creation`, or `src/agents`
- `runtime` and `agents` will invoke `ModelProviderPort` through port interfaces
- `governance` may apply cost and permission checks before model inference
- Provider SDKs will be isolated inside adapter files, not in the port interface

## Open Questions

- Should `ModelProviderPort` follow the same pattern as `ConnectorPort` (single `execute()` method) or use a richer interface (chat/embed/rerank as separate methods)?
- Should streaming be a first-class concern in the port interface or handled through wrapper utilities?
- Should token accounting be part of `ModelProviderPort` or handled separately by `governance`/`storage`?

## ChatGPT Handoff Context

`src/capabilities/models` is scaffold-only. No implementation. Reserved for future model-provider port (`ModelProviderPort`) and adapters (Claude, GPT, Gemini, local LLMs, embeddings). Current Anthropic SDK usage stays in `src/agents/` until `ModelProviderPort` is defined.
