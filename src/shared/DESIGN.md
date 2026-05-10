# Design: src/shared

## Current Design Summary

`shared` is a zero-dependency utility layer. It provides small, generic helpers used by multiple modules. No implementation files exist yet. The layer is intentionally minimal — it exists to prevent utility duplication, not to accumulate logic.

## Design Goals

- Provide a single home for pure, generic utilities to prevent duplication across modules.
- Remain free of business logic, domain types, and module-specific behavior.
- Keep the dependency count at zero (no other `src/` modules).

## Key Decisions

- **Utility-only**: anything domain-specific belongs in its own module, not here.
- **No `src/` imports**: `shared` must not depend on `core` or any other module. Even `core` types must not be imported here to avoid coupling.
- **Growth policy**: a utility belongs in `shared` only if two or more modules need it. Single-use helpers stay in their own module.

## Tradeoffs

- Keeping `shared` dependency-free means it cannot use `core` types. Utilities that wrap `core` types (e.g., a helper that formats a `Thought`) belong in the module that owns that type, not here.
- A strict "two-module rule" before adding to `shared` prevents premature abstraction but may cause short-term duplication.

## Alternatives Considered

- **Merge `shared` into `core`** — rejected. `core` is for domain types; mixing in generic utilities would blur its purpose and risk adding dependencies.
- **No `shared` layer, duplicate per module** — rejected. Logging, error handling, and result types are needed everywhere; duplication would create maintenance overhead.

## Current Assumptions

- `Logger`, `AppError`, `Result<T>`, `ConfigHelper`, and `DateUtils` are the first planned utilities.
- All of these are pure or have minimal, well-understood side effects.
- External libraries in `shared` require explicit approval and must serve clearly generic purposes.

## Open Questions

- Should `Result<T>` be a first-class type in `src/triggers` (as a cross-cutting concern) or stay in `shared`? Given that `shared` cannot import `core`, there is no circular risk either way.
- Is a structured `Logger` needed before any other module is implemented, or should logging be added lazily?

## Future Evolution

- As modules are implemented, `shared` will grow organically with utilities that are proven to be cross-module.
- If `shared` grows large, it may be split into sub-categories (e.g., `shared/logging`, `shared/errors`).

## ChatGPT Handoff Context

`src/shared` is an empty utility layer with zero `src/` dependencies. Planned utilities include Logger, AppError, Result<T>, ConfigHelper, DateUtils. Nothing is implemented yet. The rule: add a utility here only if two or more modules need it. Do not import `src/triggers` or any other `src/` module.
