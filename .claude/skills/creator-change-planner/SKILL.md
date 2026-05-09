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

After implementation is complete, always run through these steps in order:

1. **`creator-interface-maintainer`** — check whether INTERFACE.md needs updating for any changed module contract.
2. **`creator-design-context-maintainer`** — decide whether the session produced design reasoning worth preserving in a DESIGN.md.
3. **`creator-progress-maintainer`** — update the latest project progress document based on what was implemented.
4. **`creator-skill-harvester`** — identify whether the session produced a reusable workflow that should become a skill.

Include this checklist at the end of every change plan so it is not forgotten.

## Rules

- Do not edit files during planning.
- Do not scan unrelated directories.
- Keep the plan short.
- Ask for approval before broad structural changes.
- Always include the post-implementation checklist in the plan output.
