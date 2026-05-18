# CreatorMesh Blueprint

This document is the north star for the entire repository. Read it before any task that touches project direction, naming, module design, or cross-phase decisions.

---

## Mission

### Long-term vision (Phase 0 framework)

CreatorMesh is a **general multi-role AI agent platform** for independent creators and small teams.

It turns thoughts, messages, and intentions into structured knowledge, plans, actions, workflows, and shipped products — across any role a creator plays: developer, designer, researcher, writer, reviewer, career manager, or solo founder.

The framework is designed top-down: a shared runtime, knowledge layer, governance, and capability registry that any role-specific agent can build on.

### Current instance (Phase 2 control plane)

CreatorMesh is currently being executed bottom-up as a **7×24 dispatch control plane for a super-individual developer**.

A super-individual uses CreatorMesh to act as a small team: breaking down mature business plan ideas into actionable development work, dispatching that work to Claude Code agents across multiple GitHub repositories, tracking outcomes, and iterating continuously — without a full-time team.

This is the first concrete instance of the Phase 0 framework. Phase 1 (shell bootstrap) validated the dispatch concept; Phase 2 is now the active implementation tier — a TypeScript-native control plane with last-mile dispatch still using GitHub Actions + Claude Code.

---

## Why one repository

Phase 1 was not a separate project. It was the **first instance** of Phase 0.

The framework's core abstractions (Workflow, Runner, Connector, Governance) were designed precisely to support this kind of multi-role coordination. Phase 1 exercised those abstractions at the dispatch layer using borrowed infrastructure (GitHub Actions + Claude Code). Phase 2 is now the active implementation tier — TypeScript modules implementing Phase 0 ports, with last-mile dispatch still using shell + GitHub Actions.

Naming alignment (see `convergence.md`) matters throughout: each Phase 2 module must use Phase 0-aligned names to keep the Phase 3 slot-in feasible.

---

## Phase evolution model

| Phase | Name | What it means |
|-------|------|----------------|
| **Phase 1** (completed) | Borrow | Shell bootstrap: GitHub Issues + Claude Code Action. Validated the dispatch concept end-to-end. |
| **Phase 2** (NOW) | Wrap | TypeScript modules implementing Phase 0 ports — LLM Loop, multi-role agents, SQLite storage, GitHub/Filesystem connectors, HTTP server + streaming frontend. |
| **Phase 3** (future) | Own | Internalize specific capabilities; add more agent roles (research, design, review). |

The transition from Phase 1 to Phase 2 was not a rewrite. It was a slot-in: each Phase 1 script became a typed module implementing an existing Phase 0 interface. This is only feasible when Phase 0-aligned names are used from the start.

---

## Convergence rule (hard rule)

Every new Phase 2 (or Phase 1 carry-over) construct must:

1. Check `docs/control-plane/convergence.md` for the corresponding Phase 0 abstraction name.
2. Use the Phase 0-aligned naming, even if the implementation is a simple adapter or YAML field.
3. Note the future migration path in a comment or `DESIGN.md` if a new module is created.

Naming drift is the primary source of future refactoring cost. The convergence map is the safeguard.

---

## Reading order

Choose the reading path based on task type. Do not read more than the path requires.

| Task type | Required reading |
|-----------|-----------------|
| Control plane (dispatch, shell scripts, GitHub workflows) | `CLAUDE.md` → `docs/blueprint.md` → `docs/control-plane/progress.md` → `docs/control-plane/convergence.md` |
| Touching existing `src/` code (runtime, agents, workflows, capabilities) | Add: `docs/architecture.md` → target module `README.md` / `DESIGN.md` / `INTERFACE.md` |
| Creating a new module or cross-phase decision | All of the above + `docs/control-plane/convergence.md` (mandatory) |
| Onboarding a new managed project | `docs/control-plane/add-managed-project.md` |

---

## Current implementation snapshot

| Category | Status | Modules / Paths |
|----------|--------|-----------------|
| **Active (Phase 2)** | Running | `src/runtime/`, `src/agents/`, `src/workflows/`, `src/capabilities/`, `src/storage/`, `src/knowledge/`, `src/server/`, `clients/creator-app/` |
| **Active (Phase 1 carry-over)** | Running | `scripts/dispatch/` (last-mile dispatcher, TS migration pending), `.github/workflows/claude.yml`, `docs/control-plane/` |
| **Planned (Phase 3 target)** | Documented | `src/governance/` (GovernanceEvaluator full implementation), additional agent roles |
| **Frozen prototype** | mock-only, pre-pivot UI reference | `clients/creator-console/` |

---

## Key constraints

- **Do not merge main.** All code changes through PR.
- **Do not assume all target code lives here.** Each managed project stays in its own GitHub repository.
- **Do not drift from convergence.md naming.** The map is the contract for Phase 3 slot-in.
- **Phase 2 modules implement Phase 0 ports.** Preserve naming alignment (see `convergence.md`).
- **Phase 3 depends on validated Phase 2 modules.** Do not build Phase 3 capabilities before Phase 2 ports are stable.
