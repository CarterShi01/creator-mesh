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
8. Apply the bottom-up propagation check (see below).
9. If no update is needed, explain why.

## Bottom-Up Propagation Rule

Documentation updates flow from the most specific level upward. Each level is more abstract than the one below.

Update order within a module (specific → abstract):
1. Implementation file (most specific, concrete)
2. `INTERFACE.md` — public contract; updated when inputs, outputs, or invariants change
3. `DESIGN.md` — design reasoning; updated when decisions, tradeoffs, or assumptions change
4. `README.md` — purpose and boundaries; updated only when the module's role changes significantly

Update order across modules (foundation → top):
1. `src/shared` — foundational; changes propagate widely
2. `src/triggers`, `src/agents`, `src/capabilities`, `src/storage`, `src/governance`
3. `src/creation`, `src/knowledge`, `src/runtime`, `src/outputs`
4. `src/workflows` — highest-level; most abstract and most concise

When a lower-level module's design changes, ask:
- Does any module at a higher layer have a design assumption that depended on the old design?
- If yes, does that module's `DESIGN.md` need a corresponding update?
- Higher-layer updates should be more abstract: summarize the impact, do not repeat the detail.

Propagation stops when the change does not affect a higher module's design assumptions, open questions, or handoff context.

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
