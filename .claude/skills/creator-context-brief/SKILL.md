---
name: creator-context-brief
description: Use when the user needs a compressed CreatorMesh project context brief for ChatGPT or another LLM. Supports optional goal and compression parameters to focus and control the length of the exported context.
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

If empty, generate a whole-project context brief.

If provided, generate a goal-focused brief.

Examples:

- goal: ""
- goal: "Add a minimal Message domain primitive"
- goal: "Design the Notion connector"
- goal: "Review the context-budget harness"

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

## Reading Strategy

Do not read implementation files by default.

Prefer documentation files first.

Always consider reading:

- README.md
- docs/vision.md
- docs/architecture.md
- docs/project-structure.md
- docs/context-map.md
- docs/context-architecture.md
- docs/design-context.md

If the goal points to a specific module, read that module's:

- README.md
- DESIGN.md, if it exists
- INTERFACE.md

If the goal is empty, summarize the whole project using project-level documentation and only compact module summaries.

If implementation details seem necessary, ask before reading source files.

## Compression Behavior

Treat compression as compression aggressiveness.

For whole-project briefs:

- Apply the requested compression broadly.

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

If a goal was provided, explain the goal-relevant modules, concepts, files, and design constraints.

If no goal was provided, summarize the most important project-wide context.

## 5. Module Background

Summarize relevant modules.

For goal-focused briefs:

- Relevant modules should get more detail.
- Unrelated modules should be compressed heavily.

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

## 8. What the Next LLM Should Help With

Write a short instruction that the user can give to ChatGPT or another LLM.

This section should be practical and goal-aware.

## 9. Source Files Used

List files read or used to generate the brief.

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

## Validation

A good context brief should allow a new ChatGPT session to understand the project or the current goal without reading the full repository.
