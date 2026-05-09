---
name: creator-change-planner
description: Use before implementing any non-trivial CreatorMesh change. Produces a concise plan with target modules, files, interface impact, checks, risks, and approval needs before editing.
---

# Creator Change Planner

Use this skill before implementing any non-trivial change.

## Procedure

1. Understand the requested change.
2. Read AGENTS.md.
3. Read docs/context-map.md.
4. Identify target modules.
5. Read target module README.md, DESIGN.md if it exists, and INTERFACE.md if it exists.
6. Do not read implementation files unless needed to prepare the plan.
7. Produce a concise change plan.

## Change Plan Format

Return:

- Goal
- Target directories
- Context files read
- Implementation files likely to inspect
- Interfaces affected
- Proposed steps
- Checks to run
- Risks
- Human approval needed

## Post-Implementation Checklist

After implementation is complete, always run through these steps in order.

### Step 1 — Bottom-up documentation update (leaf to root)

Update documentation from the most specific level upward, stopping when a level is unaffected:

1. **Implementation file** — confirm the change is correct and complete.
2. **Module `INTERFACE.md`** (via `creator-interface-maintainer`) — update if public contract changed (inputs, outputs, dependencies, invariants).
3. **Module `DESIGN.md`** (via `creator-design-context-maintainer`) — update if design decisions, tradeoffs, or assumptions changed.
4. **Module `README.md`** — update only if the module's role or boundaries changed significantly.

### Step 2 — Cross-module propagation check

After updating a module's docs, check whether higher-layer modules need corresponding updates.

Layer order (foundation to top):
1. `src/core`, `src/shared`
2. `src/triggers`, `src/intake`, `src/agents`, `src/runners`, `src/connectors`, `src/storage`, `src/governance`
3. `src/knowledge`, `src/orchestrator`, `src/outputs`
4. `src/workflows`

Higher-layer updates should be more abstract and concise — summarize the impact, do not repeat the detail.

### Step 3 — Progress and skill review

5. **`creator-progress-maintainer`** — update the latest project progress document based on what was implemented.
6. **`creator-skill-harvester`** — identify whether the session produced a reusable workflow that should become a skill.

Include this checklist at the end of every change plan so it is not forgotten.

## Rules

- Do not edit files during planning.
- Do not scan unrelated directories.
- Keep the plan short.
- Ask for approval before broad structural changes.
- Always include the post-implementation checklist in the plan output.
