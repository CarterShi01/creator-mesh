# Claude Code Instructions for CreatorMesh

Follow `AGENTS.md` as the primary instruction file for all development work in this project.

## Required Reading Order

Before reading implementation files, always read in this order:

1. `AGENTS.md`
2. `docs/context-map.md` — when available
3. `docs/architecture.md`
4. Target directory `README.md`
5. Target directory `DESIGN.md` — when available
6. Target directory `INTERFACE.md` — when available
7. Only then: specific implementation files needed for the task

## Context Budget

This project follows a context-budget-first development style.

You are working in a codebase that will grow. Treat your context window as a limited resource.

- Read the minimum needed to complete the task correctly.
- Do not scan implementation files when a README or INTERFACE document is sufficient.
- Do not load multiple files speculatively.
- Prefer targeted reads over broad exploration.

## Planning Before Editing

For any non-trivial change:

1. State what you are going to do and which files will be affected.
2. Wait for confirmation if the change is large or crosses module boundaries.
3. Then make the edits.

## Design Context

When useful design reasoning emerges during a session, suggest updating the relevant `DESIGN.md`.

Use `creator-design-context-maintainer` when asked to preserve design context.

## Skill Invocation

Invoke project skills using slash commands:

- `/creator-context-navigator`
- `/creator-change-planner`
- `/creator-interface-maintainer`
- `/creator-skill-harvester`
- `/creator-design-context-maintainer`
- `/creator-context-brief`
- `/creator-progress-maintainer`

Fallback natural-language invocations for `creator-context-brief`:

- "Use creator-context-brief."
- "Generate a CreatorMesh context brief."

`creator-context-brief` is a manual read-only context export skill. It is used to generate a compressed project or goal-specific brief for ChatGPT or another LLM. It should not run the normal development harness or modify files.

Fallback natural-language invocations for `creator-progress-maintainer`:

- "Use creator-progress-maintainer."
- "Update CreatorMesh project progress."

`creator-progress-maintainer` is a post-change project progress skill. It should be used after meaningful code, documentation, architecture, or skill changes to update the latest project progress document based on repository evidence.

## After Meaningful Work

After completing a meaningful task, suggest:

- What should be documented or updated in a README or INTERFACE file.
- Whether a reusable skill should be created for this type of task.
- Whether a summary should be added to `docs/context-map.md`.

This keeps future sessions cheaper and faster.
