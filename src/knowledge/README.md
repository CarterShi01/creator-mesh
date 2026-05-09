# Knowledge

The `knowledge` directory manages the structured knowledge layer of CreatorMesh.

This layer is responsible for thoughts, notes, ideas, plans, reflections, and other knowledge objects that may be created from inputs.

It should not be tied to a single knowledge tool. Notion may be a future connector, but the knowledge layer itself should remain tool-agnostic.

## What belongs here

- Thought processing
- Note structuring
- Idea modeling
- Knowledge relationships
- Knowledge tree concepts
- Reflection and summary models
- Mind-map-ready knowledge structures

## What does not belong here

- Direct Notion API calls
- Direct XMind integration
- Coding agent execution
- External message transport
- Low-level storage adapters

## Role in the architecture

`knowledge` turns captured inputs into reusable personal knowledge assets.

It is where thoughts and messages can become structured knowledge before they are turned into plans, actions, workflows, or shipped products.
