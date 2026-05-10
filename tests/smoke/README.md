# Smoke Tests

Smoke tests verify that the most important code paths basically run without errors.

They are fast, dependency-light, and run on every verify:quick.

## Scope

- One or a few representative calls per feature.
- Verify that critical functions return valid output.
- Verify that invalid input is rejected.
- Do not test every edge case — that is the job of unit tests.

## Current Coverage

| File | Tests |
|---|---|
| `triggers/createThought.smoke.test.ts` | createThought() basic behavior |
| `triggers/createMessage.smoke.test.ts` | createMessage() basic behavior |

## Adding Smoke Tests

A smoke test belongs here when:
- A new domain primitive is implemented.
- A new public function is added to `src/triggers`.
- A new module crosses the boundary from stub to implementation.
