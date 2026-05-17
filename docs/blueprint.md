# CreatorMesh Blueprint

This document is the north star for the entire repository. Read it before any task that touches project direction, naming, module design, or cross-phase decisions.

---

## Mission

### Long-term vision (Phase 0 framework)

CreatorMesh is a **general multi-role AI agent platform** for independent creators and small teams.

It turns thoughts, messages, and intentions into structured knowledge, plans, actions, workflows, and shipped products — across any role a creator plays: developer, designer, researcher, writer, reviewer, career manager, or solo founder.

The framework is designed top-down: a shared runtime, knowledge layer, governance, and capability registry that any role-specific agent can build on.

### Current instance (Phase 1 control plane)

CreatorMesh is currently being executed bottom-up as a **7×24 dispatch control plane for a super-individual developer**.

A super-individual uses CreatorMesh to act as a small team: breaking down mature business plan ideas into actionable development work, dispatching that work to Claude Code agents across multiple GitHub repositories, tracking outcomes, and iterating continuously — without a full-time team.

This is the first concrete instance of the Phase 0 framework. It validates the framework's abstractions in a real, running workflow before those abstractions are generalized.

---

## Why one repository

Phase 1 is not a separate project. It is the **first instance** of Phase 0.

The framework's core abstractions (Workflow, Runner, Connector, Governance) were designed precisely to support this kind of multi-role coordination. Phase 1 exercises those abstractions at the dispatch layer, using borrowed infrastructure (GitHub Actions + Claude Code) instead of a full internal runtime.

As Phase 1 validates the workflow, Phase 2 will replace borrowed infrastructure with implementations of the Phase 0 ports — without redesigning the abstractions. This is why naming alignment (see `convergence.md`) matters now, not later.

---

## Phase evolution model

| Phase | Name | What it means |
|-------|------|----------------|
| **Phase 1** (NOW) | Borrow | GitHub Issues + Claude Code Action + shell scripts. No internal runtime. |
| **Phase 2** | Wrap | Replace shell with TypeScript modules implementing Phase 0 ports (RunnerPort, ConnectorPort). Add WorkflowRun storage. |
| **Phase 3** | Own | Internalize specific capabilities as dispatch volume justifies. Add more agent roles (research, design, review). |

The transition from Phase 1 to Phase 2 is not a rewrite. It is a slot-in: each Phase 1 script becomes a typed module that implements an existing Phase 0 interface. This is only feasible if Phase 1 names things correctly from the start.

---

## Convergence rule (hard rule)

Every new Phase 1 construct must:

1. Check `docs/control-plane/convergence.md` for the corresponding Phase 0 abstraction name.
2. Use the Phase 0-aligned naming, even if the implementation is a simple shell script or YAML field.
3. Note the future migration path in a comment or `DESIGN.md` if a new module is created.

Naming drift is the primary source of future refactoring cost. The convergence map is the safeguard.

---

## Reading order

Choose the reading path based on task type. Do not read more than the path requires.

| Task type | Required reading |
|-----------|-----------------|
| Phase 1 control plane (dispatch, scripts, GitHub workflows) | `CLAUDE.md` → `docs/blueprint.md` → `docs/control-plane/progress.md` → `docs/control-plane/convergence.md` |
| Touching existing `src/` code (runtime, agents, workflows, capabilities) | Add: `docs/architecture.md` → target module `README.md` / `DESIGN.md` / `INTERFACE.md` |
| Creating a new module or cross-phase decision | All of the above + `docs/control-plane/convergence.md` (mandatory) |
| Onboarding a new managed project | `docs/control-plane/add-managed-project.md` |

---

## Current implementation snapshot

| Category | Status | Modules / Paths |
|----------|--------|-----------------|
| **Active (Phase 1)** | Running | `scripts/dispatch/`, `.github/workflows/claude.yml`, `docs/control-plane/`, `configs/projects.example.yaml` |
| **Frozen-Live** | Working code, no new commits since 2026-05-16 | `src/runtime/`, `src/agents/`, `src/workflows/`, `src/capabilities/` |
| **Planned (Phase 2/3 target)** | Documented, no implementation yet | `src/knowledge/`, `src/storage/`, `src/shared/` |
| **Frozen prototype** | mock-only, pre-pivot UI reference | `clients/creator-console/` |

---

## Key constraints

- **Do not merge main.** All code changes through PR.
- **Do not build internal runtime complexity in Phase 1.** Use GitHub + Claude Code as the executor.
- **Do not assume all target code lives here.** Each managed project stays in its own GitHub repository.
- **Do not drift from convergence.md naming.** The map is the contract for future integration.
- **Phase 1 does not depend on the Planned modules.** Those are targets, not current requirements.
