---
name: creator-progress-maintainer
description: Use after meaningful CreatorMesh code, documentation, architecture, or skill changes. Reviews repository evidence and updates the latest project progress document without inventing completed work.
---

# Creator Progress Maintainer

Use this skill after a meaningful CreatorMesh development session.

This skill updates project progress documentation based on actual repository evidence.

It is similar to the post-change review skills, but its focus is project progress.

It should not implement product logic.
It should not add dependencies.
It should not make commits.
It should not invent progress.

## Purpose

Keep CreatorMesh project progress accurate across sessions.

The progress document should help Claude Code, ChatGPT, other LLMs, and human collaborators understand:

- what currently exists
- what was completed
- what is planned
- what is partially present
- what is missing
- what the current focus is
- what should happen next
- what risks are known

## When to Use

Use this skill after:

- a code feature is implemented
- a documentation layer is added or changed
- a new skill is added
- a module interface changes
- a design context document is created or updated
- a project management document changes
- a significant harness validation is completed
- project status has meaningfully changed

Do not use it after trivial typo fixes unless progress documentation would otherwise become misleading.

## Procedure

1. Find the latest project progress file: `docs/project-progress-*.md`
2. Read the latest project goal file: `docs/project-goal-*.md`
3. Inspect repository evidence relevant to the current session.
4. Identify what changed.
5. Classify changes as:
   - completed
   - partially completed
   - planned
   - missing
   - present but unvalidated
6. Update the latest project progress document.
7. Keep the update concise and evidence-based.
8. Do not invent completed work.
9. If a new dated progress file should be created instead of updating the latest one, explain why and ask for approval.

## What to Update

Consider updating:

- Current Phase
- Current Repository Evidence
- Completed Work
- Current Focus
- Next Recommended Work
- Known Risks
- Current Strategy
- Progress Summary

## Rules

- Do not claim completion without repository evidence.
- Distinguish present from validated.
- Distinguish planned from implemented.
- Preserve useful existing progress history.
- Avoid rewriting the whole document unless necessary.
- Keep progress practical and current.
- Do not include secrets.
- Do not include long raw diffs.
- Do not make a git commit.

## Output

Report:

- Latest progress file reviewed
- Latest goal file reviewed
- Evidence inspected
- Progress updates made
- Items marked as missing, planned, partial, or unvalidated
- Suggested next work
- Git diff summary

## Validation

A good progress update should allow a new Claude Code or ChatGPT session to understand the current project state without relying on chat history.
