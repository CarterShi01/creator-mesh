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

## Rules

- Do not edit files during planning.
- Do not scan unrelated directories.
- Keep the plan short.
- Ask for approval before broad structural changes.
