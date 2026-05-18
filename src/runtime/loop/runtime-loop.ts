import { randomUUID } from "crypto";
import { loadModelConfig } from "../llm/model-config.js";
import { createRuntimeLLMClient } from "../llm/runtime-llm-client.js";
import type { RuntimeLLMClient } from "../llm/runtime-llm-client.js";
import { createRuntimeGraph } from "../graph/create-runtime-graph.js";
import { writeRuntimeEvents } from "../events/runtime-event-writer.js";
import type { RuntimeEvent } from "../events/runtime-event.js";
import type { RuntimeToolName } from "../tools/controller-tools.js";
import type { RuntimeStatus } from "../graph/runtime-state.js";
import { getToolRegistry } from "../tools/tool-registry.js";

export interface RuntimeInput {
  sessionId?: string;
  userInput: string;
}

export interface RuntimeTurnResult {
  sessionId: string;
  turnId: string;
  status: RuntimeStatus;
  finalResponse: string;
  selectedToolName?: RuntimeToolName;
  selectedToolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  events: RuntimeEvent[];
}

function makeInputEvent(sessionId: string, turnId: string, userInput: string): RuntimeEvent {
  return {
    id: randomUUID(),
    sessionId,
    turnId,
    type: "input_received",
    message: "User input received",
    data: { length: userInput.length },
    createdAt: new Date().toISOString(),
  };
}

// runRuntimeTurnWithClient is the core loop, accepting an injected LLM client.
// Used directly by tests and wrapped by the production entry point below.
export async function runRuntimeTurnWithClient(
  input: RuntimeInput,
  llmClient: RuntimeLLMClient,
  sessionId?: string,
  turnId?: string,
  onEvent?: (event: RuntimeEvent) => void
): Promise<RuntimeTurnResult> {
  const sid = sessionId ?? input.sessionId ?? randomUUID();
  const tid = turnId ?? randomUUID();
  const inputEvent = makeInputEvent(sid, tid, input.userInput);
  onEvent?.(inputEvent);
  const graph = createRuntimeGraph(llmClient);

  try {
    const finalState = await graph.invoke(
      {
        sessionId: sid,
        turnId: tid,
        userInput: input.userInput,
        events: [inputEvent],
        status: "received",
        interpretedIntent: "",
        selectedToolName: "none",
        selectedToolArgs: {},
        toolResult: null,
        finalResponse: "",
      },
      onEvent ? { configurable: { onEvent } } : undefined
    );

    const allEvents: RuntimeEvent[] = finalState.events ?? [];
    await writeRuntimeEvents(allEvents).catch(() => {});

    const toolName = finalState.selectedToolName as RuntimeToolName | undefined;
    const toolArgs = finalState.selectedToolArgs as Record<string, unknown> | undefined;

    return {
      sessionId: finalState.sessionId as string,
      turnId: finalState.turnId as string,
      status: finalState.status as RuntimeStatus,
      finalResponse: (finalState.finalResponse as string) || "No response generated.",
      selectedToolName: toolName === "none" ? undefined : toolName,
      selectedToolArgs: toolArgs && Object.keys(toolArgs).length > 0 ? toolArgs : undefined,
      toolResult: finalState.toolResult ?? undefined,
      events: allEvents,
    };
  } catch (err) {
    const message = (err as Error).message;
    await writeRuntimeEvents([inputEvent]).catch(() => {});
    return {
      sessionId: sid,
      turnId: tid,
      status: "failed",
      finalResponse: `Runtime error: ${message}`,
      events: [inputEvent],
    };
  }
}

// runRuntimeTurn is the production entry point.
// It loads real API config from environment variables.
export async function runRuntimeTurn(
  input: RuntimeInput,
  onEvent?: (event: RuntimeEvent) => void
): Promise<RuntimeTurnResult> {
  const sessionId = input.sessionId ?? randomUUID();
  const turnId = randomUUID();
  const inputEvent = makeInputEvent(sessionId, turnId, input.userInput);

  let config;
  try {
    config = loadModelConfig();
  } catch (err) {
    const configEvent: RuntimeEvent = {
      id: randomUUID(),
      sessionId,
      turnId,
      type: "tool_failed",
      message: (err as Error).message,
      createdAt: new Date().toISOString(),
    };
    await writeRuntimeEvents([inputEvent, configEvent]).catch(() => {});
    return {
      sessionId,
      turnId,
      status: "failed",
      finalResponse: (err as Error).message,
      events: [inputEvent, configEvent],
    };
  }

  const llmClient = createRuntimeLLMClient(config);
  return runRuntimeTurnWithClient(input, llmClient, sessionId, turnId, onEvent);
}

// callToolWithApproval executes a tool that was held at needs_approval,
// after the user has explicitly confirmed. Skips LLM and permission check.
export async function callToolWithApproval(
  toolName: RuntimeToolName,
  toolArgs: Record<string, unknown>,
  sessionId: string
): Promise<RuntimeTurnResult> {
  const turnId = randomUUID();
  const registry = getToolRegistry();
  const tool = registry.get(toolName);

  const events: RuntimeEvent[] = [];
  function ev(type: RuntimeEvent["type"], message: string): RuntimeEvent {
    return { id: randomUUID(), sessionId, turnId, type, message, createdAt: new Date().toISOString() };
  }

  if (!tool) {
    const e = ev("tool_failed", `Tool not found: ${toolName}`);
    await writeRuntimeEvents([e]).catch(() => {});
    return { sessionId, turnId, status: "failed", finalResponse: `Tool not found: ${toolName}`, events: [e] };
  }

  events.push(ev("tool_started", `Executing approved tool: ${toolName}`));

  try {
    const result = await tool.run(toolArgs);
    events.push(ev("tool_completed", `${toolName} completed`));
    const finalResponse = formatResult(result);
    events.push(ev("response_created", finalResponse));
    await writeRuntimeEvents(events).catch(() => {});
    return { sessionId, turnId, status: "completed", finalResponse, selectedToolName: toolName, toolResult: result, events };
  } catch (err) {
    const message = (err as Error).message;
    events.push(ev("tool_failed", message));
    await writeRuntimeEvents(events).catch(() => {});
    return { sessionId, turnId, status: "failed", finalResponse: `Dispatch failed: ${message}`, events };
  }
}

function formatResult(result: unknown): string {
  if (!result || typeof result !== "object") return String(result ?? "Done.");
  const r = result as Record<string, unknown>;
  if (typeof r["output"] === "string") return r["output"];
  if (typeof r["stdout"] === "string" && r["stdout"]) return r["stdout"];
  if (Array.isArray(r["projects"])) {
    const ps = r["projects"] as Array<{ id?: string; repo?: string }>;
    return ps.length === 0 ? "No projects found." :
      `${ps.length} project(s):\n` + ps.map((p) => `  • ${p.id} → ${p.repo}`).join("\n");
  }
  return JSON.stringify(result, null, 2);
}
