import { Annotation } from "@langchain/langgraph";
import type { RuntimeEvent } from "../events/runtime-event.js";
import type { RuntimeToolName } from "../tools/controller-tools.js";

export type RuntimeStatus =
  | "received"
  | "planning"
  | "tool_selected"
  | "needs_approval"
  | "executing"
  | "completed"
  | "blocked"
  | "failed";

export const RuntimeStateAnnotation = Annotation.Root({
  sessionId: Annotation<string>,
  turnId: Annotation<string>,
  userInput: Annotation<string>,
  interpretedIntent: Annotation<string>,
  selectedToolName: Annotation<RuntimeToolName>,
  selectedToolArgs: Annotation<Record<string, unknown>>,
  toolResult: Annotation<unknown>,
  events: Annotation<RuntimeEvent[]>({
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  }),
  finalResponse: Annotation<string>,
  status: Annotation<RuntimeStatus>,
});

export type RuntimeGraphState = typeof RuntimeStateAnnotation.State;
