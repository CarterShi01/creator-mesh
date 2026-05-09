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

A Context Brief is a temporary compressed context generated for another LLM or collaborator.

## Goal-Aware Briefing

A context brief may be project-wide or goal-focused.

If no goal is provided, the brief should summarize the overall project.

If a goal is provided, the brief should focus on the modules and design context relevant to that goal.

## Compression

Context briefs support a compression value between 0 and 1.

0 means minimally compressed.

1 means highly compressed.

When a goal is provided, relevant information should be preserved more than unrelated background.

## Typical Use

Example request:

Use creator-context-brief.

goal: Add a minimal Message domain primitive

compression: 0.4

The output can be copied into ChatGPT to continue design analysis or implementation planning.
