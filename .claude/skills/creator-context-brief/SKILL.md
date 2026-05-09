---
name: creator-context-brief
description: Use when the user needs a compressed CreatorMesh project context brief for ChatGPT or another LLM. Supports optional goal and compression parameters. When goal is empty, generates a whole-project brief with next-task recommendations from the latest project goal and progress. When goal is provided, generates a goal-focused brief treating goal as the target requirement.
---

# Creator Context Brief

Use this skill when the user wants to export CreatorMesh project context for ChatGPT, another LLM, or a human collaborator.

This is a manual read-only context export skill.

It does not implement code.
It does not modify files unless explicitly asked.
It does not run the normal development harness.
It does not perform front-2/back-3 development steps.

## Purpose

Generate a compact, goal-aware context brief from CreatorMesh documentation.

The output should help another LLM understand the current project context without reading the full repository or previous conversation history.

## Parameters

The user may provide two parameters.

### goal

Optional.

**If empty:** generate a whole-project context brief based on the latest project goal and project progress documents. Include recommended next tasks.

**If provided:** treat goal as the target requirement the user wants to implement or analyze. Generate a goal-focused brief concentrated on modules and design context relevant to that goal.

Examples:

- goal: "" → whole-project brief with next-task recommendations
- goal: "Add a minimal Message domain primitive" → goal-focused brief for that feature
- goal: "Design the Notion connector" → goal-focused brief for that design task
- goal: "Review the context-budget harness" → goal-focused brief for that review

### compression

Optional.

A number between 0 and 1.

Default: 0.5.

Meaning:

- 0.0 means minimally compressed and more detailed.
- 0.5 means balanced.
- 1.0 means highly compressed and very concise.

If goal is provided:

- Goal-relevant context should be compressed less aggressively.
- Unrelated background context should be compressed more aggressively.
- Preserve details that help the next LLM reason about the goal.
- Summarize unrelated modules briefly.

If goal is empty:

- Apply compression broadly to the whole-project brief.
- Next-task recommendations should remain clear enough to act on regardless of compression level.

## Reading Strategy

Do not read implementation files by default.

Prefer documentation files first.

**When goal is empty, always read:**

- `docs/project-goal-*.md` (latest version)
- `docs/project-progress-*.md` (latest version)
- `docs/architecture.md`
- `docs/context-map.md`
- `README.md`

Also consider reading:

- `docs/vision.md`
- `docs/project-structure.md`
- `docs/context-architecture.md`
- `docs/design-context.md`

**When goal is provided, read:**

- `docs/architecture.md`
- `docs/context-map.md`
- Target module `README.md`
- Target module `DESIGN.md`, if it exists
- Target module `INTERFACE.md`

Also read the latest project progress for current known state:

- `docs/project-progress-*.md` (latest version)

If implementation details seem necessary, ask before reading source files.

## Compression Behavior

Treat compression as compression aggressiveness.

For whole-project briefs:

- Apply the requested compression broadly.
- Next-task recommendations must remain actionable even at high compression.

For goal-focused briefs:

- Use lower effective compression for goal-relevant files.
- Use higher effective compression for unrelated background.
- Do not lose key constraints, assumptions, or design decisions related to the goal.

Recommended behavior:

- compression <= 0.25: detailed brief
- 0.25 < compression <= 0.6: balanced brief
- 0.6 < compression <= 0.85: concise brief
- compression > 0.85: ultra-compact brief

## Output Format

Use this format:

---

# CreatorMesh Context Brief

## 1. Brief Metadata

- Goal:
- Compression:
- Scope:
- Intended audience:

## 2. Project Mission

Summarize CreatorMesh's mission and positioning.

## 3. Current Architecture

Summarize the current architecture layers and key principles.

## 4. Relevant Context for Current Goal

If goal is provided: explain goal-relevant modules, concepts, files, and design constraints.

If goal is empty: summarize the most important project-wide context drawn from the latest project goal document.

## 5. Module Background

Summarize relevant modules.

For goal-focused briefs:

- Relevant modules should get more detail.
- Unrelated modules should be compressed heavily.

For whole-project briefs:

- Summarize the most active or significant modules based on current progress.

## 6. Design Constraints and Rules

Summarize constraints that the next LLM must respect.

Examples:

- context-budget-first
- README / DESIGN / INTERFACE distinction
- human-in-the-loop
- no unnecessary dependencies
- tool-agnostic architecture
- local-first where possible

## 7. Current Known State

Summarize what currently exists and what does not exist yet.

Draw from the latest project progress document when goal is empty.

Draw from the relevant module state when goal is provided.

## 8. Recommended Next Tasks or Next LLM Help

**When goal is empty:**

Recommend several possible next tasks based on the latest project goal and progress documents.

For each recommended task, include:

- Task name
- Why it is next
- Expected scope (small / medium / large)
- Risk level (low / medium / high)
- Whether it is suitable for harness validation (yes / no / partial)

Do not recommend tasks that are already completed.

Do not invent capabilities that do not exist.

**When goal is provided:**

Write a short instruction that the user can give to ChatGPT or another LLM to continue work on that goal.

This section should be practical and goal-aware.

## 9. Source Files Used

List files read or used to generate the brief.

---

## Rules

- Do not modify files.
- Do not run commands unless needed to inspect file existence.
- Do not read broad implementation files by default.
- Do not invent project state.
- If a file is missing, say it is missing.
- Keep the brief proportional to the requested compression.
- Preserve goal-relevant design context.
- Do not include secrets.
- Do not include long raw excerpts.
- Optimize for handoff to ChatGPT or another LLM.
- When goal is empty, ground next-task recommendations in the latest progress document.

## Validation

A good context brief should allow a new ChatGPT session to understand the project or the current goal without reading the full repository.

When goal is empty, a good brief should also give the user a clear sense of what to work on next.
