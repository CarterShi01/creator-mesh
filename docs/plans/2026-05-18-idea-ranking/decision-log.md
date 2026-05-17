# Decision Log — 2026-05-18-idea-ranking

## 2026-05-17 — Initial decomposition

**Decision:** Decompose into 4 tasks as listed in `tasks.jsonl`:

1. T01 — Stable `id` field on every idea (8-hex SHA-256 of `source_product_id:pitch_index`).
2. T02 — Rank-override persistence (`data/ranks.json` + helper module) and merge in `list_ideas`.
3. T03 — `PATCH /ideas/<idea-id>/rank` endpoint, calling the T02 helper.
4. T04 — `python -m idea_factory rank <idea-id> <rank>` CLI, calling the T02 helper.

Each task ships its own tests (acceptance criteria are verified in the same PR that ships the behavior).

**Alternatives considered:**

- **Single-PR implementation.** Ship all four pieces in one task. Rejected: the brief explicitly lists 5 concerns (ID, persistence, endpoint, CLI, tests) and bundling them defeats independent review under the "<10 minutes per task" rule in the planner instructions, and produces a PR too large for a single Claude Code session to keep small and focused.
- **5 tasks with a separate "tests" task.** Rejected: each task is too small to ship a coherent behavior without its tests, and a tests-only task at the end has no clear acceptance criteria that isn't already implied by the prior tasks. Bundling tests with the behavior they verify keeps each task atomic and independently reviewable.
- **Combine T03 (endpoint) and T04 (CLI) into one "surfaces" task.** Rejected: they touch different files (`api.py` vs CLI entry point), have different validation surfaces (HTTP 400/404 vs argparse usage/exit codes), and can be reviewed independently. Splitting keeps each PR small.
- **Put the persistence helper inside T03 instead of T02.** Rejected: doing so would force T04 (CLI) to either duplicate persistence logic or take a dependency on T03's HTTP layer. Extracting the helper in T02 keeps T03 and T04 cleanly parallel after their shared prerequisite.
- **Two tasks: "ID + persistence" merged, then "endpoint + CLI" merged.** Rejected on the same grounds — the merged tasks would each be too big to ship in one Claude Code session, and reviewers benefit from seeing the stable ID added in isolation before persistence is layered on top.

**Rationale:**

- **Dependency-driven ordering.** T01 (stable ID) is a prerequisite for any keyed override store, so it must land first. T02 introduces the override store and the merge step, so `GET /ideas?sort=rank` immediately reflects overrides as soon as data exists. T03 and T04 are parallel surfaces on top of T02; they share no code beyond the helper, so they can be implemented (and reviewed) in either order once T02 merges.
- **Tests co-located with behavior.** A task that ships behavior X without verifying X has no usable acceptance criteria. Co-locating keeps each task self-contained and matches the brief's "Tests: cover rank persistence, the PATCH endpoint, stable ID generation, and the sort behavior with mixed generated + overridden ranks" requirement distributed across the tasks that introduce each concern.
- **Scope boundaries.** No DB, no auth, no UI — these are explicit non-goals in the brief and are reiterated in every task's Non-goals section to prevent scope creep during execution.
- **Atomic, independently reviewable.** Each task touches a distinct concern (identifier, persistence, HTTP, CLI), keeping each PR small enough for a human to review in under 10 minutes per the planner instructions.
