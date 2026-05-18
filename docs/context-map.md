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
| `clients/creator-app` | Phase 2 — Active Next.js + Tailwind PWA; SSE streaming runtime chat; runs/plans/settings views; iOS PWA manifest. |
| `clients/creator-console` | Frozen prototype (pre-pivot) — Vite + React + TypeScript; WorkflowClient abstraction + RunLedger; mock-only runtime. No active development. |

## Source Map

| Directory | Purpose |
|-----------|---------|
| `src/triggers` | Interaction boundary — stable input primitives (Thought, Message), trigger signal types, input normalization. |
| `src/runtime` | Always-on LLM Loop and graph execution layer. Receives raw human or trigger input, uses a real LLM API (LangChain + Anthropic) to select ControllerPanel tools, enforces permission policy, records runtime events to JSONL, supports future checkpointing, visualization, workflow extraction, and human-in-the-loop governance. Sub-modules: `loop/`, `graph/`, `llm/`, `tools/`, `adapters/`, `policies/`, `events/`. Exposes HTTP API via `src/server/` (Hono + SSE). CLI: `runtime-cli.ts` (conversational), `decompose-cli.ts` (multi-role pipeline). |
| `src/server` | HTTP API server — Hono framework, REST endpoints (`/api/runs`, `/api/plans`, `/api/projects`, `/api/turns`), SSE streaming for LLM Loop turns, Bearer auth. Phase 2 implemented. |
| `src/agents` | Role-based execution subjects — PM / Architect / Planner / OP / FeatureCollector agents; `CreatorMeshLLMClient` (shared LLM client). Phase 2 implemented. |
| `src/workflows` | Stable creator routines — `WorkflowRunnerPort`, `LocalWorkflowRunner`, `TreeWorkflowRunner`; `FanoutStep` + `HumanReviewStep`; `idea-decompose.ts` (multi-role pipeline WorkflowDefinition). Phase 2 implemented. |
| `src/capabilities` | Callable capability layer — groups runners, connectors, and models (scaffold) |
| `src/capabilities/runners` | Execution environment adapters (Claude Code, human runner, future Codex/OpenHands) |
| `src/capabilities/connectors` | External system integrations. Phase 2 implemented: `github/` (TS replacement for gh CLI), `filesystem/` (artifact writes), `notion/`. |
| `src/capabilities/models` | Scaffold only — future model-provider/inference capabilities |
| `src/governance` | Approval, audit, permission, and safety policies (MVP conservative policy implemented; full GovernanceEvaluator is Phase 3 target) |
| `src/knowledge` | Callable soft knowledge — Phase 2 implemented: role-specific prompt templates and output schemas for pm/, architect/, planner/, op/ |
| `src/storage` | Persistence abstractions and adapters — Phase 2 implemented: SQLite adapters for WorkflowRun, WorkflowDefinition, Relation, ManagedProject; import tooling; migrations 001 + 002 |
| `src/shared` | Small reusable utilities. |


## Cost Rule

Do not read implementation files until you have read the target module's `README.md`. Prefer reading `.ts` source files directly over any secondary document.
