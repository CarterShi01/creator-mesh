# CLAUDE.md

You are the main development executor for this repository.

## Two-layer positioning (30-second read)

- **Long-term target (Phase 0):** General multi-role AI agent framework — see `docs/blueprint.md`.
- **Current phase (Phase 1 Borrow):** Super-individual dispatch control plane — lightweight glue coordinating GitHub, Claude Code, and shell scripts.

Phase 1 is the first concrete instance of the Phase 0 framework. They share one repository because they converge. Do not treat them as separate projects.

## Required reading

**Every task:**

1. This file (`CLAUDE.md`)
2. `docs/blueprint.md` — north star, phase model, convergence rule
3. `docs/control-plane/progress.md` — current capability status

**When naming any new Phase 1 construct:**

4. `docs/control-plane/convergence.md` — mandatory before naming fields, files, or modules

**By task type (add to the above):**

| Task type | Additional reading |
|-----------|-------------------|
| Touching `src/` code | `docs/architecture.md` → target module `README.md` / `DESIGN.md` / `INTERFACE.md` |
| Onboarding a new managed project | `docs/control-plane/add-managed-project.md` |

## Task execution workflow

1. Read the required documents above.
2. Restate the task briefly.
3. Create a short implementation plan.
4. Make the smallest reasonable change.
5. Run available build/test/lint commands when relevant.
6. Update `docs/control-plane/progress.md` when changing the control-plane workflow.
7. Create or update a PR summary: What changed · Why · How tested · Risks · Follow-up tasks.

## Hard rules

- Do not merge main.
- Do not deploy production.
- Do not touch secrets, credentials, tokens, billing, DNS, or production databases.
- Do not modify production infrastructure unless explicitly requested by the human operator.
- All code changes must go through PR.
- High-risk actions require human approval.

## Convergence hard rule

Before naming any new Phase 1 field, file, or module: check `docs/control-plane/convergence.md`. Using a name that drifts from the Phase 0 abstraction creates future refactoring debt. The convergence map is the safeguard.

## Phase 1 principles

- Prefer documentation-first scaffolding, simple scripts, and GitHub-based workflow integration.
- Do not introduce unnecessary runtime complexity.
- Do not assume all target project code lives inside this repository. CreatorMesh dispatches to multiple GitHub-managed systems.
- Do not build what GitHub + Claude Code already provide.
