# Harness Tests

Harness tests validate CreatorMesh's AI collaboration rules and architecture boundaries.

These are not business logic tests. They encode project rules that Claude Code and other agents are expected to follow manually — and verify them deterministically.

**Status: Active (minimal first layer).**

## Why This Layer Exists

CreatorMesh is built using a context-budget-first, documentation-first development discipline enforced by AI agents. Without machine-verifiable checks, those rules can quietly drift.

The harness layer converts project rules into assertions that fail loudly.

## Current Checks

| File | What it verifies |
|---|---|
| `architecture-boundaries.test.ts` | `src/triggers` does not import from higher-level `src/*` modules (input-boundary invariant) |
| `docs-presence.test.ts` | Required root docs and per-module `README.md` / `INTERFACE.md` exist |
| `skills-format.test.ts` | Each `.claude/skills/*/` directory contains a `SKILL.md` file |

## What These Checks Do Not Cover Yet

These checks are intentionally minimal. Future checks may include:

- `INTERFACE.md` content sync validation (does implementation match the contract?)
- `DESIGN.md` validation for modules with non-trivial design reasoning
- Skill metadata validation (required YAML frontmatter fields)
- Context brief format validation
- Progress document presence and freshness checks
- Dependency boundary rules for all modules beyond `core`
- Tool-agnostic boundary enforcement across the full `src/` tree

## Running Harness Tests

```bash
npm run test:harness     # harness tests only
npm run verify:harness   # typecheck + harness tests
npm run verify           # typecheck + all tests (includes harness)
```
