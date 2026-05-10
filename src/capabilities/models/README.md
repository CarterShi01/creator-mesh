# Models

`src/capabilities/models` is reserved for future model-provider and inference capabilities. It is intentionally not implemented in this phase.

Current model usage (e.g., the Anthropic SDK call inside `AnthropicThoughtClient` in `src/agents/`) remains where it already exists. This module must not become the CreatorMesh brain; `creation` owns worldview semantics and `runtime` owns the execution loop.

## What will belong here (future)

- Model provider port interfaces (`ModelProviderPort`)
- Chat model adapters (Claude, GPT, Gemini, local LLMs)
- Embedding model adapters
- Reranker model adapters
- Vision model adapters
- Model registry and capability declarations
- Token accounting and cost tracking

## What does not belong here

- The worldview or methodological core — `creation` owns that
- The LLM loop or session/context management — `runtime` owns that
- Agent reasoning roles — `agents` owns those
- Connector and runner adapters — those are in `connectors` and `runners`

## Key principle

A model provider is a callable physical capability — not the system brain. When this module is implemented, `ModelProviderPort` will be a stable interface that `runtime` and `agents` invoke, similar to how `RunnerPort` and `ConnectorPort` work today.

## Current status

This module is scaffold-only. No implementation files are defined. Do not add inference logic, SDK dependencies (OpenAI, Gemini, etc.), or model registry code until this phase is explicitly started.
