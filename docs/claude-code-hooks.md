# Claude Code Hooks Strategy

This document describes the intended future hook strategy for CreatorMesh.

**Current status: documented placeholder. Hooks are not yet configured.**

Actual hook configuration should be added only after the team confirms the preferred Claude Code hook format and local developer workflow.

## What hooks are for

Claude Code hooks run shell commands automatically in response to session events — for example, after a file is edited or before a session ends.

In CreatorMesh, hooks are intended as a lightweight friction-reduction layer, not a verification gate. They run fast checks during active development so that small mistakes surface early without waiting for a manual `npm run verify`.

## Intended future hooks

### Post-edit: TypeScript source changes

**Trigger:** When any `.ts` file in `src/` is saved or edited.

**Intended command:** `npm run verify:quick`

**Rationale:** Catches TypeScript errors and smoke test regressions immediately after source edits. Fast enough to run frequently.

### Post-edit: Docs, AGENTS.md, CLAUDE.md, or skills changes

**Trigger:** When `AGENTS.md`, `CLAUDE.md`, any file under `docs/`, or any file under `.claude/skills/` is edited.

**Intended command:** `npm run verify:harness`

**Rationale:** Documentation and skill changes may affect harness assertions. Running harness tests early catches doc drift before the task is complete.

## Why hooks must remain lightweight

Hooks run during active development, potentially many times per session. A slow hook disrupts the development loop.

Rules:
- Hooks should run in under 5 seconds where possible.
- Hooks should not run full integration or e2e test suites.
- If a hook is consistently slow or noisy, it should be removed or scoped down.

## Why full verification belongs at task completion and CI

Hooks catch fast errors early, but they are not authoritative.

- A hook may not run if the file trigger is missed.
- Hooks do not run in CI.
- Hooks do not replace the developer's responsibility to run `npm run verify` before closing a task.

The verification contract is:
1. Claude Code runs the relevant `npm run verify*` command before declaring a task complete.
2. CI runs `npm run verify` on every pull request.
3. Hooks reduce friction between those two checkpoints — nothing more.

## Configuration note

Claude Code hook configuration lives in `.claude/settings.json` or `.claude/settings.local.json`.

When hooks are ready to be implemented, add a `hooks` section to the appropriate settings file. Do not add hooks until the format and workflow have been validated locally.
