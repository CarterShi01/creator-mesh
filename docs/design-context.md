# Design Context

CreatorMesh uses `DESIGN.md` files to capture middle-layer design context.

## Why DESIGN.md Exists

CreatorMesh already uses:

- `README.md` for high-level module purpose and boundaries.
- `INTERFACE.md` for module contracts, inputs, outputs, dependencies, and invariants.
- Source code for implementation details.

However, there is a missing middle layer.

`DESIGN.md` captures the reasoning behind the current design.

It explains why the module is shaped the way it is, what decisions have been made, what tradeoffs exist, and what another AI assistant or human collaborator needs to know before continuing design work.

## Intended Audience

`DESIGN.md` is written for:

- ChatGPT sessions that need compact project context.
- Claude Code sessions that need design background before implementation.
- Human collaborators reviewing architecture or design choices.
- Future maintainers trying to understand why the current design exists.

## Difference Between README, DESIGN, and INTERFACE

| File | Purpose | Level |
|---|---|---|
| `README.md` | Explains what the directory is responsible for and what belongs there | High-level responsibility |
| `DESIGN.md` | Explains the current design thinking, decisions, tradeoffs, assumptions, and open questions | Middle-layer design context |
| `INTERFACE.md` | Explains public concepts, inputs, outputs, dependencies, invariants, and change rules | Contract-level interface |
| Source code | Implements the actual behavior | Implementation detail |

## Recommended Reading Order

For non-trivial changes, agents should read:

1. `AGENTS.md`
2. `docs/context-map.md`
3. `docs/architecture.md`
4. Target directory `README.md`
5. Target directory `DESIGN.md`, if it exists
6. Target directory `INTERFACE.md`
7. Specific implementation files needed for the task

## When to Create a DESIGN.md

Create a `DESIGN.md` when a module or workflow has meaningful design context that should be preserved.

Good candidates include:

- A non-trivial module
- A workflow with multiple steps
- A connector with important integration choices
- A runner with execution tradeoffs
- A governance policy
- An architecture decision that may be revisited later

Do not create design files for trivial utilities unless they contain important design decisions.

## When to Update a DESIGN.md

Update `DESIGN.md` when:

- A design decision changes.
- A major tradeoff is discovered.
- A new alternative is considered and rejected.
- A module's responsibilities change.
- A ChatGPT or Claude discussion produces useful design context.
- A feature is implemented in a way that future agents need to understand.
- The current design assumptions become outdated.

## What DESIGN.md Should Not Contain

`DESIGN.md` should not become:

- A full implementation dump
- A changelog
- A duplicate README
- A duplicate INTERFACE file
- A transcript of every conversation
- A place for secrets or credentials

## ChatGPT Handoff

One important use of `DESIGN.md` is ChatGPT handoff.

When a Claude Code session produces useful design reasoning, that reasoning should be summarized into `DESIGN.md`.

The goal is that a future ChatGPT session can read the relevant `DESIGN.md` and quickly understand the current design state without reading large amounts of code or previous conversation history.
