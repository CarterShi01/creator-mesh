# Intake

The `intake` directory converts raw inputs into normalized internal capture items.

Inputs may come from notes, messages, chats, files, browser captures, tools, or manual entries. The intake layer should make these inputs consistent enough for the rest of the system to process.

## What belongs here

- Input normalization
- Lightweight classification
- Source metadata extraction
- Language detection
- Conversion from raw trigger payloads to internal capture items

## What does not belong here

- Long-term planning
- Deep agent reasoning
- Tool execution
- Final decisions
- Code generation
- Permanent knowledge structure management

## Role in the architecture

`intake` is the bridge between messy real-world input and CreatorMesh's internal models.

It should prepare input for later knowledge processing, orchestration, and workflow execution.
