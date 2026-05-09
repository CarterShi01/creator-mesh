# Runners

The `runners` directory contains adapters for executing work through external or local execution engines.

A runner is different from an agent.

An agent defines a role and reasoning behavior. A runner executes work using a specific system, tool, or environment.

Possible future runners may include:

- Claude Code runner
- Codex runner
- OpenHands runner
- Aider runner
- Local script runner
- Manual human runner

## What belongs here

- Runner interfaces
- Execution adapters
- Tool invocation wrappers
- Sandboxed execution entry points
- Result collection from execution engines

## What does not belong here

- Agent role definitions
- Knowledge modeling
- Trigger handling
- High-level product logic
- External API connectors that are not execution engines

## Role in the architecture

`runners` lets CreatorMesh execute tasks through different engines without binding the whole system to one coding agent, automation tool, or execution environment.
