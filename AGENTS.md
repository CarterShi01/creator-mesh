# CreatorMesh Agent Rules

## Project Purpose

CreatorMesh is a personal agent operating system for independent creators, turning thoughts and messages into structured knowledge, plans, actions, workflows, and shipped products.

## Core Rule

CreatorMesh follows a context-budget-first development style.

Do not read the whole repository. Read only what the task requires, in the order defined below.

## Required Reading Order

Before reading any implementation file, read in this order:

1. `AGENTS.md` — this file
2. `docs/context-map.md` — if it exists
3. `docs/architecture.md` — architectural layers and design direction
4. Target directory `README.md` — purpose and boundaries of the relevant module
5. Target directory `DESIGN.md` — if it exists
6. Target directory `INTERFACE.md` — if it exists
7. Only then: specific implementation files needed for the task

Do not skip to implementation files before completing this reading order.

## Planning Rule

For non-trivial changes, produce a short plan before editing files.

The plan should include:
- What the task is
- Which modules are affected
- What will be created, changed, or removed
- Any risks or open questions

Get human confirmation before proceeding if the change is large or crosses module boundaries.

## Interface-First Rule

Every major source directory should eventually have:

- `README.md` — explains the directory's purpose, what belongs there, and what does not
- `INTERFACE.md` — describes the public types, functions, and contracts exported by the module

When adding a new module or making a significant change to an existing one, update the relevant `README.md` and `INTERFACE.md` before or alongside the implementation.

## Cost Control Principles

1. **Interfaces before implementation.** Read `INTERFACE.md` before reading source code.
2. **Plans before edits.** Think before writing. Avoid exploratory edits.
3. **Skills before repeated prompting.** If a task pattern repeats, suggest turning it into a reusable skill.
4. **Summaries before long context.** Prefer reading a summary or interface over scanning full implementations.
5. **Scripts before token-heavy reasoning.** Use a script to extract what you need rather than loading large files.
6. **Human approval before expensive or risky actions.** Pause and confirm before large refactors, deletions, or cross-boundary changes.
7. **Every expensive session should produce reusable knowledge.** After meaningful work, suggest what should be documented, summarized, or turned into a skill.

## Design Context Rule

For non-trivial design or architecture work, read and maintain the relevant `DESIGN.md`.

`DESIGN.md` captures the reasoning behind current design decisions, tradeoffs, assumptions, and open questions.

When a Claude Code or ChatGPT session produces useful design reasoning, summarize it into the relevant `DESIGN.md` instead of leaving it only in conversation history.

## Verification Policy

After any implementation change, run the smallest relevant verification command before finishing.

| Change type | Minimum verification |
|---|---|
| TypeScript source edits | `npm run verify:quick` |
| Architecture, docs, skills, or harness changes | `npm run verify:harness` then `npm run verify` |
| Any change crossing module boundaries | `npm run verify` |

Before claiming a task is complete, report:
1. Which command was run.
2. Whether it passed.
3. If it failed, what was fixed before passing.

Do not claim a change is complete unless verification has passed, or clearly explain why verification could not be run.

## Post-Implementation Skills

After any non-trivial implementation or documentation session, run the following skills in order before writing a completion summary.

| When | Required skills |
|------|----------------|
| After any implementation, doc, design, or architecture change | `creator-progress-maintainer` |
| After any session that may contain a reusable pattern | `creator-skill-harvester` |

These are not optional. Do not write a completion summary until both have been run.

Before claiming a session is complete, confirm:
1. `creator-progress-maintainer` was run and the progress document was updated.
2. `creator-skill-harvester` was run and any skill candidates were identified or ruled out.

If a skill cannot be run (e.g. no meaningful change occurred), state that explicitly — do not silently skip.

## Prohibited Defaults

- Do not read the whole repository unless explicitly asked.
- Do not add dependencies without approval.
- Do not modify unrelated modules.
- Do not delete files without approval.
- Do not change architecture boundaries without explaining why.
