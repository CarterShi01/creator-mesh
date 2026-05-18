# loop/

The runtime entry point.

Exports:
- `runRuntimeTurn(input)` — production entry point, loads real API config from env vars
- `runRuntimeTurnWithClient(input, llmClient)` — testable variant, accepts injected LLM client
