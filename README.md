# CreatorMesh

CreatorMesh is a personal AI agent platform for independent creators and developers.

**Long-term vision:** A general multi-role agent operating system that turns thoughts, messages, and intentions into structured knowledge, plans, actions, and shipped products — across any role a creator plays.

**Current phase:** A 7×24 dispatch control plane for a super-individual developer, coordinating Claude Code agents across multiple GitHub repositories to act as a small team.

→ [docs/blueprint.md](docs/blueprint.md) — full strategic north star and phase model

## How it works (Phase 1)

1. A task is dispatched to a managed GitHub repository as an issue.
2. A `@claude` comment triggers the Claude Code GitHub Action.
3. Claude Code modifies the repository and opens a pull request.
4. A human reviews and merges.

→ [docs/control-plane/progress.md](docs/control-plane/progress.md) — current capabilities

## Who is it for?

Independent developers, designers, researchers, writers, solo founders — anyone operating across multiple roles who needs continuous, asynchronous agent execution without a full-time team.

## Principles

- Human-in-the-loop by default
- Borrow before building (GitHub + Claude Code as execution layer)
- Converge gradually (Phase 1 dispatch → Phase 2 TypeScript ports → Phase 3 owned runtime)
- Auditability and user control at every step

## License

MIT
