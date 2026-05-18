import { StateGraph, END, START } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { randomUUID } from "crypto";
import { RuntimeStateAnnotation } from "./runtime-state.js";
import type { RuntimeGraphState, RuntimeStatus } from "./runtime-state.js";
import type { RuntimeLLMClient } from "../llm/runtime-llm-client.js";
import type { RuntimeToolName } from "../tools/controller-tools.js";
import { getToolRegistry } from "../tools/tool-registry.js";
import { checkPermission } from "../policies/permission-policy.js";
import type { RuntimeEvent } from "../events/runtime-event.js";

function makeEvent(
  state: Pick<RuntimeGraphState, "sessionId" | "turnId">,
  type: RuntimeEvent["type"],
  message?: string,
  data?: unknown
): RuntimeEvent {
  return {
    id: randomUUID(),
    sessionId: state.sessionId,
    turnId: state.turnId,
    type,
    message,
    data,
    createdAt: new Date().toISOString(),
  };
}

function getOnEvent(config?: RunnableConfig): ((e: RuntimeEvent) => void) | undefined {
  return config?.configurable?.["onEvent"] as ((e: RuntimeEvent) => void) | undefined;
}

function formatToolResult(result: unknown): string {
  if (result === null || result === undefined) return "Tool returned no output.";

  if (typeof result === "object") {
    const r = result as Record<string, unknown>;

    if ("output" in r && typeof r["output"] === "string") {
      return r["output"];
    }

    if ("projects" in r && Array.isArray(r["projects"])) {
      const projects = r["projects"] as Array<{ id?: string; repo?: string }>;
      if (projects.length === 0) return "No managed projects found.";
      return (
        `Found ${projects.length} managed project(s):\n` +
        projects.map((p) => `  • ${p.id ?? "?"} → ${p.repo ?? "?"}`).join("\n")
      );
    }
  }

  return JSON.stringify(result, null, 2);
}

export function createRuntimeGraph(llmClient: RuntimeLLMClient) {
  const toolRegistry = getToolRegistry();

  const graph = new StateGraph(RuntimeStateAnnotation)

    .addNode("llm_decide_tool", async (state: RuntimeGraphState, config?: RunnableConfig) => {
      const onEvent = getOnEvent(config);
      const events: RuntimeEvent[] = [];
      const emit = (e: RuntimeEvent) => { events.push(e); onEvent?.(e); };

      emit(makeEvent(state, "llm_started", "Calling LLM for intent understanding and tool selection"));

      try {
        const decision = await llmClient.decideTool(state.userInput);

        emit(makeEvent(state, "llm_completed", "LLM decision received", {
          toolName: decision.toolName,
          confidence: decision.confidence,
        }));
        emit(makeEvent(state, "intent_interpreted", decision.intent));
        emit(makeEvent(state, "tool_selected", `Selected tool: ${decision.toolName}`));

        if (decision.needsClarification) {
          const question =
            decision.clarificationQuestion ?? "Could you clarify what you'd like to do?";
          return {
            events,
            interpretedIntent: decision.intent,
            selectedToolName: "none" as RuntimeToolName,
            selectedToolArgs: {},
            status: "completed" as RuntimeStatus,
            finalResponse: question,
          };
        }

        return {
          events,
          interpretedIntent: decision.intent,
          selectedToolName: decision.toolName,
          selectedToolArgs: (decision.toolArgs as Record<string, unknown>) ?? {},
          status: "tool_selected" as RuntimeStatus,
        };
      } catch (err) {
        const message = (err as Error).message;
        emit(makeEvent(state, "tool_failed", `LLM call failed: ${message}`));
        return {
          events,
          status: "failed" as RuntimeStatus,
          finalResponse: `Runtime error: Unable to process your request. ${message}`,
        };
      }
    })

    .addNode("check_permission", (state: RuntimeGraphState, config?: RunnableConfig) => {
      const onEvent = getOnEvent(config);
      const toolName = state.selectedToolName;
      const decision = checkPermission(toolName);
      const events: RuntimeEvent[] = [];
      const emit = (e: RuntimeEvent) => { events.push(e); onEvent?.(e); };

      emit(makeEvent(state, "permission_checked", `${toolName}: ${decision}`, { toolName, decision }));

      if (decision === "needs_approval") {
        return {
          events,
          status: "needs_approval" as RuntimeStatus,
          finalResponse:
            `The action "${toolName}" requires human approval before it can be dispatched. ` +
            "Please confirm you want to proceed before this task is sent to the managed project.",
        };
      }

      if (decision === "denied" || toolName === "none") {
        return {
          events,
          status: "blocked" as RuntimeStatus,
          finalResponse:
            "I understand your request, but I don't have a matching tool available. " +
            "Available tools: list_projects, list_runs, check_run_status, " +
            "create_claude_task (requires human approval).",
        };
      }

      return { events, status: "executing" as RuntimeStatus };
    })

    .addNode("execute_tool", async (state: RuntimeGraphState, config?: RunnableConfig) => {
      const onEvent = getOnEvent(config);
      const toolName = state.selectedToolName;
      const tool = toolRegistry.get(toolName);
      const events: RuntimeEvent[] = [];
      const emit = (e: RuntimeEvent) => { events.push(e); onEvent?.(e); };

      emit(makeEvent(state, "tool_started", `Executing tool: ${toolName}`));

      if (!tool) {
        emit(makeEvent(state, "tool_failed", `Tool not registered: ${toolName}`));
        return {
          events,
          status: "failed" as RuntimeStatus,
          finalResponse: `Tool not found: ${toolName}`,
        };
      }

      try {
        const result = await tool.run(state.selectedToolArgs);
        emit(makeEvent(state, "tool_completed", `${toolName} completed successfully`));
        return { events, toolResult: result, status: "completed" as RuntimeStatus };
      } catch (err) {
        const message = (err as Error).message;
        emit(makeEvent(state, "tool_failed", `${toolName} failed: ${message}`));
        return {
          events,
          status: "failed" as RuntimeStatus,
          finalResponse: `Tool execution failed: ${message}`,
        };
      }
    })

    .addNode("respond", (state: RuntimeGraphState, config?: RunnableConfig) => {
      const onEvent = getOnEvent(config);
      const events: RuntimeEvent[] = [];
      const emit = (e: RuntimeEvent) => { events.push(e); onEvent?.(e); };

      if (state.finalResponse) {
        emit(makeEvent(state, "response_created", state.finalResponse));
        return { events };
      }

      const finalResponse = formatToolResult(state.toolResult);
      emit(makeEvent(state, "response_created", finalResponse));
      return { events, finalResponse };
    })

    .addEdge(START, "llm_decide_tool")
    .addConditionalEdges("llm_decide_tool", (state: RuntimeGraphState) => {
      if (state.status === "completed" || state.status === "failed") return "respond";
      return "check_permission";
    })
    .addConditionalEdges("check_permission", (state: RuntimeGraphState) => {
      if (state.status === "executing") return "execute_tool";
      return "respond";
    })
    .addEdge("execute_tool", "respond")
    .addEdge("respond", END);

  return graph.compile();
}
