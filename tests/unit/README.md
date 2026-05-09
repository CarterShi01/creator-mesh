# Unit Tests

Unit tests verify detailed function-level behavior.

**Status: Planned. No unit tests exist yet.**

## Intended Scope

- One test file per source module function or class.
- Thorough coverage of valid inputs, invalid inputs, and edge cases.
- No external I/O or inter-module calls.
- Fast and deterministic.

## When to Add

Add unit tests when:
- A function has non-trivial internal logic that smoke tests do not cover.
- A bug was found and fixed — add a regression test.
- A module grows beyond one or two trivial functions.
