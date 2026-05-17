# Plan: Complete Idea Ranking System for idea-factory

## Idea brief

The `idea-factory` repo already has a deterministic `rank` field (1–5) on each generated idea and a `GET /ideas?sort=rank` endpoint, but the rank is read-only and regenerated on every call. This plan adds the missing pieces of a complete ranking system: a stable per-idea identifier, JSON-file persistence of user-set rank overrides, a `PATCH /ideas/<idea-id>/rank` endpoint, and a `python -m idea_factory rank <idea-id> <rank>` CLI command. No database, no auth, no UI, no breaking changes to the existing sort behavior.

## Goal

A user can update the rank of any generated idea via either the HTTP API (`PATCH /ideas/<idea-id>/rank` with `{"rank": <int>}`) or the CLI (`python -m idea_factory rank <idea-id> <rank>`). Overrides are persisted to `data/ranks.json`, keyed by a deterministic 8-hex-char idea ID derived from `source_product_id + pitch_index`. Subsequent calls to `GET /ideas` (and especially `GET /ideas?sort=rank`) reflect the overridden rank, sorted descending. Ranks are validated to the inclusive range 1–5. The existing `GET /ideas?sort=rank` contract continues to work unchanged for ideas without overrides. Each behavior shipped is covered by tests.

## Non-goals

- No database — keep using JSON files (`data/ranks.json`).
- No user authentication or authorization.
- No UI changes.
- No AI-driven ranking; the existing deterministic `_rank_for_index()` remains the default.
- No breaking changes to the current `GET /ideas?sort=rank` response shape (other than the additive `id` field).
- No migration tooling — `data/ranks.json` is created on first write.

## Decomposition rationale

Four atomic tasks, ordered by dependency:

1. **T01 (stable ID)** is foundational — every later task needs to reference an idea. It is independently reviewable: the change is purely additive (`id` field on each idea) and ships with tests for ID determinism and uniqueness.
2. **T02 (persistence + override layer)** introduces `data/ranks.json` and applies overrides inside `list_ideas`, so `GET /ideas?sort=rank` immediately reflects overrides once data exists. It depends on T01 because overrides are keyed by the stable `id`. It ships its own tests for the override-merge and sort behavior.
3. **T03 (PATCH endpoint)** wires the HTTP surface onto T02's persistence helper. Depends on T01 and T02. Ships endpoint tests (validation, 404, success path, persistence across requests).
4. **T04 (CLI command)** wires the CLI surface onto the same persistence helper. Independent of T03 (does not call HTTP), but depends on T01 and T02. Ships CLI tests.

This ordering keeps each task small (one cohesive concern), independently reviewable, and independently mergeable. Tests live inside the task that ships the behavior so reviewers can verify acceptance criteria in the same PR.

## Tasks

1. T01 — Add stable `id` field to ideas — Compute an 8-hex-char SHA-256 of `source_product_id + pitch_index` and attach it as `id` on every generated idea, with tests for determinism and presence in API responses.
2. T02 — Persist rank overrides in `data/ranks.json` and apply them in `list_ideas` — Add a small persistence helper and merge overrides over generated ranks when listing/sorting, with tests covering the merge and the `?sort=rank` behavior on mixed data.
3. T03 — Add `PATCH /ideas/<idea-id>/rank` endpoint — Accept `{"rank": <int>}`, validate range 1–5, persist via the T02 helper, return the updated idea, with endpoint tests.
4. T04 — Add `python -m idea_factory rank <idea-id> <rank>` CLI command — Wire the CLI to the same persistence helper from T02 with validation and CLI tests.

## Tracker issue

https://github.com/CarterShi01/idea-factory/issues/7

## Plan artifact

docs/plans/2026-05-18-idea-ranking/
