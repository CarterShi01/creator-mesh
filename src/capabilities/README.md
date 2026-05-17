# Capabilities

`src/capabilities` is the callable capability layer of CreatorMesh. It groups provider-backed and execution-backed capabilities used by `runtime` and `agents`. It does not own the CreatorMesh worldview, LLM loop, session/context, or semantic creation model.

## What capabilities are

Capabilities are callable physical or provider-backed abilities that the system can invoke:

- **runners** — execution environments: Claude Code, local scripts, command-line execution, human runner, future Codex/OpenHands/Aider
- **connectors** — integrations with external systems: Notion, GitHub, Gmail, Calendar, MCP servers, databases, file systems
- **models** — future model-provider and inference capabilities: Claude, GPT, Gemini, local LLMs, embedding models, rerankers, vision models (intentionally scaffold-only in this version)

## What capabilities are NOT

- Not the system brain — `runtime`, `agents`, and `workflows` decide what to do
- Not the LLM loop — `runtime` owns the execution loop, session/context, tool invocation, and permission gate
- Not agent reasoning — `agents` own role-based execution; capabilities are what agents *use*

## Key rules

- `runtime` invokes capabilities through port interfaces (`RunnerPort`, `ConnectorPort`)
- `agents` may request capabilities through runtime; agents do not call provider SDKs directly
- `governance` must still protect side effects — runtime invokes governance before capability execution when side effects are possible
- Provider SDKs remain inside capability adapter implementation folders (`runners/claude-code/`, `connectors/notion/`, etc.)

## Structure

```
src/capabilities/
  runners/          — execution environment adapters
  connectors/       — external system integrations
  models/           — scaffold only; model-provider capabilities (not yet implemented)
```

## Role in the architecture

```
runtime
  ↓ (invokes through port interfaces)
capabilities
  ├── runners       (execution environments)
  ├── connectors    (external integrations)
  └── models        (future inference/model providers)
```

Capabilities provide callable abilities. They do not decide what to do — `runtime`, `agents`, and `workflows` decide. Capabilities execute.
