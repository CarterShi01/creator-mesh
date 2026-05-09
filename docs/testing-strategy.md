# Testing Strategy

CreatorMesh uses a phased, AI-era testing approach.

## Principle

Claude Code can generate and run tests, but **deterministic commands decide whether a change is acceptable**.

AI judgment is not a substitute for passing tests. A change is not verified unless `npm run verify` (or at minimum `npm run verify:quick`) passes cleanly.

CI does not replace Claude Code. Claude Code does not replace CI. They serve different roles.

## Test Layers

CreatorMesh defines six test layers. Only the smoke layer is currently active.

### smoke (active)

Verifies that the most important code paths basically run.

- Fast, few dependencies.
- Runs on every `verify:quick`.
- One or a few tests per public primitive.

### unit (planned)

Verifies detailed function-level behavior.

- Thorough per-function coverage.
- No external I/O.
- Added when a module grows beyond trivial functions.

### contract (planned)

Verifies public module contracts and exported interfaces.

- Ensures implementation matches INTERFACE.md.
- Added when a module's public contract is stable.

### harness (planned)

Verifies architecture rules, documentation presence, skill format, and AI collaboration constraints.

- Checks that every module has README.md and INTERFACE.md.
- Checks that skills have valid frontmatter.
- Checks that `core` does not import from other modules.
- Turns architecture rules into machine-verifiable assertions.

### integration (planned)

Verifies interaction between modules.

- Added when two or more modules are meaningfully implemented.
- May involve real I/O or external stubs.

### e2e (planned)

Verifies full user-facing workflows.

- Added when a complete workflow exists: input → orchestrator → output.
- Simulates real creator inputs and verifies real outputs.

## Verification Commands

| Command | What it runs |
|---|---|
| `npm run typecheck` | TypeScript type checking, no emit |
| `npm run test:smoke` | Smoke tests only |
| `npm run test` | All tests |
| `npm run verify:quick` | typecheck + smoke tests |
| `npm run verify` | typecheck + all tests |

## Current Phase

The project is in early foundation-building.

Only the smoke layer is active. All other layers are intentional placeholders.

The current goal is to:
1. Prove that `createThought()` and `createMessage()` work correctly.
2. Establish the verification workflow.
3. Give future sessions a clear place to add tests as modules are implemented.

## Layer 2: Harness Validation

### Why harness validation exists

CreatorMesh relies on AI agents following project rules: reading order, interface-first design, zero-dependency invariants, documentation presence, and skill format. These rules are written in `AGENTS.md` and `CLAUDE.md`, but words in a markdown file are not enforced automatically.

The harness layer exists to make project rules machine-verifiable. When a rule is in the harness, it fails a test rather than silently drifting.

### Why AI-generated code needs deterministic rule checks

Claude Code can generate correct-looking code that violates an architecture boundary. For example:
- A `src/core` file that imports from `src/shared`
- A module added without `README.md` or `INTERFACE.md`
- A skill directory missing its `SKILL.md`

Without a harness test, these violations pass `npm run verify:quick` undetected. With harness tests, they fail deterministically on the next `npm run verify`.

### Currently implemented checks

| Test file | Rule enforced |
|---|---|
| `architecture-boundaries.test.ts` | `src/core` must not import from any other `src/*` module |
| `docs-presence.test.ts` | `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/context-map.md` must exist; each `src/` module must have `README.md` and `INTERFACE.md` |
| `skills-format.test.ts` | Each `.claude/skills/*/` directory must contain `SKILL.md`; test is a no-op if `.claude/skills` is absent |

### Placeholder checks (not yet implemented)

- `INTERFACE.md` content sync validation
- `DESIGN.md` format and presence rules
- Skill YAML frontmatter validation
- Context brief format validation
- Dependency boundary rules for modules beyond `core`
- Progress document freshness checks

## AI-Era Testing Notes

Claude Code can generate tests, but:
- Tests must be deterministic and machine-verifiable.
- Claude Code should run `npm run verify:quick` after every code change and report results.
- A change is not complete until verify:quick passes.
- Harness tests, when implemented, will enforce architecture rules that Claude Code is currently responsible for following manually.
