# Harness Tests

Harness tests verify architecture rules, documentation presence, skill format, and AI collaboration constraints.

**Status: Planned. No harness tests exist yet.**

## Intended Scope

- Verify that every `src/` module has a `README.md` and `INTERFACE.md`.
- Verify that every `.claude/skills/*/SKILL.md` has valid YAML frontmatter with `name` and `description`.
- Verify that `core` does not import from other `src/` modules.
- Verify that documentation files are not empty stubs.

## Why This Layer Exists

CreatorMesh uses a documentation-first, context-budget-first development discipline.

The harness layer is where these architectural rules become machine-verifiable rather than relying only on human review or Claude Code's judgment.

## When to Add

Add harness tests when:
- The documentation structure is stable enough to validate programmatically.
- A skill format standard is finalized.
- Architecture boundary rules are ready to be enforced automatically.
