# Integration Tests

Integration tests verify interaction between modules.

**Status: Planned. No integration tests exist yet.**

## Intended Scope

- Verify that two or more modules work together correctly.
- Verify that data flows correctly across layer boundaries.
- May involve real I/O, file system access, or external tool stubs.

## When to Add

Add integration tests when:
- A workflow connects two or more implemented modules.
- A connector interacts with a real or stubbed external system.
- A runner hands off work between an agent and an execution environment.

Integration tests should not be added until at least two modules are meaningfully implemented.
