# CreatorMesh Context Map

This is the compact source map for AI coding agents working in this project.

## Required Reading Order

Before reading any implementation file, read in this order:

1. `CLAUDE.md`
2. `docs/blueprint.md` — north star and convergence rule
3. `docs/control-plane/progress.md` — current status
4. `docs/context-map.md` — this file (for `src/` work)
5. `docs/architecture.md`
6. Target directory `README.md`
7. Only then: specific implementation files needed for the task

## Client Layer

| Directory | Purpose |
|-----------|---------|
| `clients/creator-console` | Phase 4 Governed Runtime Bridge — isolated Vite + React + TypeScript PWA client; WorkflowClient abstraction + RunLedger; mock-only runtime; zero src/ import. Status: Frozen (pre-pivot prototype). |

## Source Map

| Directory | Purpose |
|-----------|---------|
| `src/triggers` | Interaction boundary — stable input primitives (Thought, Message), trigger signal types, input normalization. |
| `src/runtime` | Always-on LLM Loop and graph execution layer. Receives raw human or trigger input, uses a real LLM API (LangChain + Anthropic) to select ControllerPanel tools, enforces permission policy, records runtime events to JSONL, supports future checkpointing, visualization, workflow extraction, and human-in-the-loop governance. Sub-modules: `loop/`, `graph/`, `llm/`, `tools/`, `adapters/`, `policies/`, `events/`. The pre-existing `runtime.ts` (StepExecutor for structured workflows) is preserved alongside. |
| `src/agents` | Role-based execution subjects — apply knowledge, request capabilities through runtime |
| `src/workflows` | Stable creator routines — reusable, creator-approved step sequences and types (WorkflowRun, WorkflowStep, etc.) |
| `src/capabilities` | Callable capability layer — groups runners, connectors, and models (scaffold) |
| `src/capabilities/runners` | Execution environment adapters (Claude Code, human runner, future Codex/OpenHands) |
| `src/capabilities/connectors` | External system integrations (Notion, GitHub, MCP, etc.) |
| `src/capabilities/models` | Scaffold only — future model-provider/inference capabilities |
| `src/governance` | Approval, audit, permission, and safety policies |
| `src/knowledge` | Callable soft knowledge — domain knowledge, principles, skills, reasoning assets. Planned (Phase 2/3 target). |
| `src/storage` | Persistence abstractions and adapters. Planned (Phase 2/3 target). |
| `src/shared` | Small reusable utilities. Planned (Phase 2/3 target). |


## Cost Rule

Do not read implementation files until you have read the target module's `README.md`. Prefer reading `.ts` source files directly over any secondary document.
