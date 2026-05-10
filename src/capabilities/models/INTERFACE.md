# Interface: src/capabilities/models

## Purpose

`models` is a scaffold-only module reserved for future model-provider and inference capabilities. No public types are defined yet.

## Deferred Public Concepts

The following are the *intended* future public concepts. They are listed here to document design intent but are **not implemented**.

### ModelProviderPort (planned)

A stable interface for invoking model capabilities — chat completion, embedding, reranking, vision — without depending on provider SDK types.

Planned shape (not final):

```
ModelProviderPort {
  providerId: string
  capabilities(): ModelProviderRegistry
  chat(request: ChatRequest): Promise<ChatResult>
  embed?(request: EmbedRequest): Promise<EmbedResult>
}
```

### ChatRequest / ChatResult (planned)

Provider-agnostic types for chat completion requests and responses.

### EmbedRequest / EmbedResult (planned)

Provider-agnostic types for embedding requests and responses.

## Current Status

No types are exported from this module. `index.ts` is empty.

## Allowed Dependencies (when implemented)

- `src/shared`
- `src/governance` (injected for cost/permission checks)

## Disallowed Dependencies (when implemented)

- `src/runtime`
- `src/creation`
- `src/agents`
- `src/workflows`

Provider SDKs (OpenAI, Anthropic SDK for inference, Gemini, etc.) must be isolated inside adapter implementation files, not in the port interface.
