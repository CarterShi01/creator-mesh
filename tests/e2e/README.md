# End-to-End Tests

End-to-end tests verify full user-facing workflows.

**Status: Planned. No e2e tests exist yet.**

## Intended Scope

- Verify that a complete workflow produces the expected output.
- Simulate real creator inputs — a thought, a message, an idea.
- Verify that the system produces the correct output artifact.

## When to Add

Add e2e tests when:
- At least one full workflow is implemented: input → orchestrator → output.
- A connector or runner produces a real artifact.
- The platform is ready for user-facing validation beyond individual module tests.
