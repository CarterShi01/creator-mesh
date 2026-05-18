# graph/

LangGraph-based runtime state machine.

- `runtime-state.ts` — defines `RuntimeStateAnnotation` (LangGraph `Annotation.Root`) and `RuntimeStatus` type
- `create-runtime-graph.ts` — builds and compiles the `StateGraph`: LLM decide → permission check → execute tool → respond

The graph is LangGraph-native and designed to later support checkpointing, pause/resume, and human-in-the-loop interrupts.
