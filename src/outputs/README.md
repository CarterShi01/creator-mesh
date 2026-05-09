# Outputs

The `outputs` directory contains output generation and delivery preparation logic.

Outputs are the results CreatorMesh produces after processing inputs.

Possible outputs may include:

- Structured knowledge
- Plans
- Actions
- Workflows
- GitHub issues
- Response drafts
- Reports
- Mind maps
- Shipped products
- Retrospectives

## What belongs here

- Output formatting
- Artifact generation
- Write-back payload preparation
- Delivery abstractions
- Report and summary generation

## What does not belong here

- Raw trigger handling
- Agent execution
- External API client internals
- Long-term storage adapters
- Core domain definitions

## Role in the architecture

`outputs` prepares the final artifacts that CreatorMesh returns to the creator or writes back to connected tools.
