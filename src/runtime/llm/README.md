# llm/

Lightweight LLM abstraction for the CreatorMesh runtime.

- `model-config.ts` — reads `ANTHROPIC_API_KEY` and `CREATORMESH_RUNTIME_MODEL` from env vars; fails fast with a clear error if the key is missing
- `runtime-llm-client.ts` — `ChatAnthropic` (via `@langchain/anthropic`) with `withStructuredOutput` for structured tool-selection decisions

The LLM receives raw user input, the list of available ControllerPanel tools, and returns a `RuntimeToolDecision` (intent + toolName + toolArgs + confidence).
