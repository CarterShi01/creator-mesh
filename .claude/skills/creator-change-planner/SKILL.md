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

### Step 3 — Progress and skill review (REQUIRED — do not skip)

These two skills are mandatory after every non-trivial session. Do not write a completion summary until both are done.

5. **`creator-progress-maintainer`** — run this skill and update the project progress document. Required even if the change feels small.
6. **`creator-skill-harvester`** — run this skill and identify skill candidates. If no reusable pattern was produced, state that explicitly.

### Completion Gate

Before writing any completion summary or end-of-session message, output this confirmation block:

```
Post-Implementation Checklist:
✓ Step 1 — Bottom-up docs updated (or: not needed — [reason])
✓ Step 2 — Cross-module propagation checked (or: not needed — [reason])
✓ Step 3a — creator-progress-maintainer run and progress updated
✓ Step 3b — creator-skill-harvester run; candidates: [list or "none"]
```

Do not write "done", "complete", or a summary until this block is output.

## Rules

- Do not edit files during planning.
- Do not scan unrelated directories.
- Keep the plan short.
- Ask for approval before broad structural changes.
- Always include the post-implementation checklist in the plan output.
- Always output the Completion Gate block before ending a session.
