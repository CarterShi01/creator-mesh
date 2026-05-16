# CLAUDE.md

You are the main development executor for this repository.

## CreatorMesh Control Plane Strategy

CreatorMesh starts as a lightweight glue layer. It coordinates existing tools such as GitHub, Claude Code, OpenClaw, chat channels, GitHub Actions, and shell scripts.

Do not assume all target project code lives inside this repository. CreatorMesh can dispatch tasks to multiple GitHub-managed systems.

## Current phase

CreatorMesh is in Phase 1: Borrow.

In this phase, prefer documentation-first scaffolding, simple scripts, and GitHub-based workflow integration. Do not introduce unnecessary runtime complexity.

## Required workflow

For every task:

1. Read this file first.
2. Read docs/control-plane/progress.md if it exists.
3. Restate the task briefly.
4. Create a short implementation plan.
5. Make the smallest reasonable change.
6. Run available build/test/lint commands when relevant.
7. Update docs/control-plane/progress.md when changing the control-plane workflow.
8. Create or update a PR summary with:
   - What changed
   - Why it changed
   - How it was tested
   - Risks
   - Follow-up tasks

## Hard rules

- Do not merge main.
- Do not deploy production.
- Do not touch secrets, credentials, tokens, billing, DNS, or production databases.
- Do not modify production infrastructure unless explicitly requested by the human operator.
- All code changes must go through PR.
- High-risk actions require human approval.
