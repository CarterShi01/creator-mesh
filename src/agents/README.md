# Agents

The `agents` directory contains agent role definitions and agent-facing behavior.

An agent is a role that can reason about a specific domain, task, or decision. Agents may exist at different levels of the system, forming an agent tree or agent mesh over time.

Possible future agents may include:

- Thought Agent
- Message Agent
- Knowledge Agent
- Life Planning Agent
- Career Agent
- Startup Agent
- Research Agent
- Engineering Agent
- Review Agent
- Governance Agent

## What belongs here

- Agent role definitions
- Agent instructions
- Agent capability descriptions
- Agent input and output contracts
- Prompt templates when appropriate

## What does not belong here

- External tool API clients
- Long-running workflow state
- Storage implementations
- Direct Claude Code, Codex, or other runner execution logic
- Tool-specific connector code

## Role in the architecture

`agents` defines who reasons about what.

Actual execution should be delegated through runners or connectors when needed.
