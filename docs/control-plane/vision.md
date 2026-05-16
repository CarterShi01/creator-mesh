# CreatorMesh Control Plane Vision

CreatorMesh is an AI workflow control plane for super-individuals and small teams.

It starts as a lightweight glue layer that coordinates existing tools such as GitHub, Claude Code, OpenClaw, chat channels, GitHub Actions, and shell scripts.

CreatorMesh should not try to own every capability from day one. Instead, it should first make the real workflow usable, observable, and reviewable. Over time, CreatorMesh can gradually internalize recurring coordination logic such as project registry, task dispatch, run tracking, review workflow, policy enforcement, notification, and agent orchestration.

## Core positioning

CreatorMesh coordinates multiple GitHub-managed software systems.

It does not require all target project code to live inside this repository. Each product, app, library, or client project can remain in its own GitHub repository. CreatorMesh manages metadata, routing, workflow, review, and tracking across these repositories.

## Phase 1 principle

Borrow first. Wrap later. Own gradually.
