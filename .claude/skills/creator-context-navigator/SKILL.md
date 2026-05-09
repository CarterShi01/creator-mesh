---
name: creator-context-navigator
description: Use when starting any CreatorMesh coding, architecture, documentation, or file modification task. Guides Claude to read project rules, context maps, directory README files, and INTERFACE files before reading implementation code.
---

# Creator Context Navigator

Use this skill at the beginning of any non-trivial CreatorMesh task.

The goal is to reduce context cost by reading compact architecture and interface documents before reading implementation files.

## Procedure

1. Read AGENTS.md.
2. Read docs/context-map.md.
3. Read docs/architecture.md.
4. Identify the target source directory.
5. Read the target directory README.md.
6. Read the target directory INTERFACE.md.
7. Only then read specific implementation files needed for the task.

## Output Before Editing

Before editing files, produce a short context plan:

- Task goal
- Target directories
- Context files read
- Implementation files likely needed
- Interfaces that may be affected
- Whether human approval is needed

## Rules

- Do not scan unrelated directories.
- Do not read the whole repository unless explicitly asked.
- Prefer interface contracts over implementation details.
- If the task affects a public module contract, update the relevant INTERFACE.md.
- If the task reveals a reusable workflow, mention it at the end.

## Completion Report

At the end of the task, report:

- Files changed
- Checks run
- Interface files updated or not needed
- Any reusable skill candidate discovered
