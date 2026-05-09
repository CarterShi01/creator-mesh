---
name: creator-design-context-maintainer
description: Use after architecture discussions, module design changes, complex implementation decisions, or ChatGPT/Claude handoff needs in CreatorMesh. Updates or proposes updates to DESIGN.md files with current design reasoning, tradeoffs, assumptions, and open questions.
---

# Creator Design Context Maintainer

Use this skill when design context should be preserved for future Claude Code, ChatGPT, or human collaborator sessions.

## Purpose

This skill keeps middle-layer design context up to date.

It helps prevent design reasoning from being lost across sessions.

## When to Use

Use this skill after:

- An architecture discussion
- A module design change
- A complex implementation decision
- A workflow design update
- A connector or runner design decision
- A governance or approval design decision
- A ChatGPT or Claude session that produced useful design reasoning

## Procedure

1. Identify the affected module, workflow, connector, runner, or design area.
2. Read the relevant `README.md`.
3. Read the relevant `DESIGN.md` if it exists.
4. Read the relevant `INTERFACE.md` if it exists.
5. Review the design reasoning from the current session.
6. Decide whether a `DESIGN.md` update is needed.
7. If needed, update the relevant `DESIGN.md` using the standard template.
8. If no update is needed, explain why.

## DESIGN.md Sections

A useful `DESIGN.md` should include:

- Current Design Summary
- Design Goals
- Key Decisions
- Tradeoffs
- Alternatives Considered
- Current Assumptions
- Open Questions
- Future Evolution
- ChatGPT Handoff Context

## Rules

- Do not duplicate README content.
- Do not duplicate INTERFACE content.
- Do not include implementation dumps.
- Do not include long conversation transcripts.
- Keep the document concise.
- Preserve design reasoning, not every detail.
- Ask for approval before rewriting large sections.
- Do not invent decisions that were not made.

## Output

Report:

- Affected design area
- DESIGN.md files reviewed
- DESIGN.md files created or updated
- Key design context added
- Open questions preserved
- Whether ChatGPT handoff context was updated

## Validation

A good DESIGN.md should allow a future ChatGPT session to understand the current design direction without reading the full codebase or past conversation history.
