# Context Brief

CreatorMesh uses context briefs to transfer project context from Claude Code to ChatGPT, another LLM, or a human collaborator.

## Why Context Briefs Exist

Claude Code often has access to the repository and project files.

ChatGPT often does not.

When design discussion moves from Claude Code to ChatGPT, the user needs a compact and accurate summary of the current project state.

A context brief solves this problem.

## Difference from Other Documents

README.md explains high-level purpose and responsibility.

DESIGN.md explains design reasoning, tradeoffs, assumptions, and handoff context.

INTERFACE.md explains public concepts, inputs, outputs, dependencies, and invariants.

Project Goal explains the mission, strategic direction, and near-term success criteria.

Project Progress explains what currently exists, what is completed, what is planned, and what the current focus is.

A Context Brief is a temporary compressed context export generated for another LLM or collaborator. It draws from all of the above.

## Two Modes

### Whole-Project Brief (goal is empty)

When no goal is provided, the creator-context-brief skill:

- Reads the latest project goal document (`docs/project-goal-*.md`)
- Reads the latest project progress document (`docs/project-progress-*.md`)
- Generates a whole-project context brief
- Recommends several possible next tasks based on current goal and progress

Each recommended next task includes:

- Task name
- Why it is next
- Expected scope
- Risk level
- Whether it is suitable for harness validation

### Goal-Focused Brief (goal is provided)

When a goal is provided, the skill treats it as the target requirement.

The brief focuses on:

- Modules and design context relevant to that goal
- Constraints and invariants the next LLM must respect
- What the next LLM should help with for that goal

Unrelated context is compressed more aggressively.

## Compression

Context briefs support a compression value between 0 and 1.

0 means minimally compressed.

1 means highly compressed.

When a goal is provided, relevant information is preserved more than unrelated background.

When goal is empty, compression controls overall length but next-task recommendations always remain actionable.

## Typical Use

### Whole-project brief with next-task recommendations:

```
/creator-context-brief
goal:
compression: 0.5
```

### Goal-focused brief for a specific feature:

```
/creator-context-brief
goal: Add a minimal Message domain primitive
compression: 0.4
```

The output can be copied into ChatGPT to continue design analysis or implementation planning.
