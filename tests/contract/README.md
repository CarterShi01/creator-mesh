# Contract Tests

Contract tests verify public module contracts and exported interfaces.

**Status: Planned. No contract tests exist yet.**

## Intended Scope

- Verify that exported types, functions, and behaviors match the documented contract in INTERFACE.md.
- Catch regressions where implementation drifts from the public contract.
- Do not test internal implementation details.

## When to Add

Add contract tests when:
- A module's INTERFACE.md is finalized and stable.
- A module is used by other modules and its contract must be reliable.
- A breaking contract change needs to be verified before it propagates.
