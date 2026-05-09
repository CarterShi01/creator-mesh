# Triggers

The `triggers` directory contains input entry points for CreatorMesh.

CreatorMesh is trigger-first. The system starts from inputs, especially Thoughts and Messages.

A trigger represents something that starts a flow.

Trigger categories may include:

- Self capture: a creator records a thought, note, idea, or reflection.
- External message: a message, request, feedback, opportunity, or task arrives from the outside world.
- Scheduled trigger: a daily review, weekly planning, or periodic reflection starts.
- System event: a tool or workflow changes state.

## What belongs here

- Trigger definitions
- Trigger source abstractions
- Trigger adapters
- Event payload entry points
- Code that receives or represents the initial signal that something should happen

## What does not belong here

- Long-term knowledge modeling
- Agent reasoning logic
- Final output generation
- Tool-specific business workflows
- Storage implementation details

## Role in the architecture

`triggers` is the first layer of the system.

It receives or represents the initial signal and passes raw input toward the intake layer for normalization.
