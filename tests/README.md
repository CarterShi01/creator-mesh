# Tests

This directory contains the CreatorMesh test suite.

## Test Layers

| Layer | Directory | Purpose | Status |
|---|---|---|---|
| Smoke | `tests/smoke/` | Verifies that the most important code paths basically run | Active |
| Unit | `tests/unit/` | Verifies detailed function-level behavior | Planned |
| Contract | `tests/contract/` | Verifies public module contracts and exported interfaces | Planned |
| Harness | `tests/harness/` | Verifies architecture rules, documentation presence, skill format, and AI collaboration constraints | Active |
| Integration | `tests/integration/` | Verifies interaction between modules | Planned |
| End-to-End | `tests/e2e/` | Verifies full user-facing workflows | Planned |

## Current State

The `smoke` and `harness` layers have real tests. All other layers are intentional placeholders.

See `docs/testing-strategy.md` for the full rationale and phased implementation plan.

## Running Tests

```bash
npm run test:smoke      # smoke tests only
npm run test:harness    # harness tests only
npm run test            # all tests
npm run verify:quick    # typecheck + smoke tests
npm run verify:harness  # typecheck + harness tests
npm run verify          # typecheck + all tests
```
