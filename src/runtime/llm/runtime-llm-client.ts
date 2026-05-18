import { ChatAnthropic } from "@langchain/anthropic";
import type { LLMModelConfig } from "./model-config.js";
import type { RuntimeToolName } from "../tools/controller-tools.js";

export interface RuntimeToolDecision {
  intent: string;
  toolName: RuntimeToolName;
  toolArgs: Record<string, unknown>;
  confidence: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

export interface RuntimeLLMClient {
  decideTool(userInput: string): Promise<RuntimeToolDecision>;
}

const DECISION_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      description: "Short description of what the user wants to accomplish",
    },
    toolName: {
      type: "string",
      enum: ["list_projects", "create_claude_task", "list_runs", "check_run_status", "none"],
      description: "The ControllerPanel tool to call, or 'none' if no tool matches",
    },
    toolArgs: {
      type: "object",
      description: "Arguments to pass to the selected tool. Use {} when no arguments are needed.",
    },
    confidence: {
      type: "number",
      description: "Confidence score from 0.0 (no confidence) to 1.0 (very confident)",
    },
    needsClarification: {
      type: "boolean",
      description: "Set to true if the user's intent is ambiguous and a clarifying question should be asked",
    },
    clarificationQuestion: {
      type: "string",
      description: "The question to ask the user when needsClarification is true",
    },
  },
  required: ["intent", "toolName", "toolArgs", "confidence"],
};

const SYSTEM_PROMPT = `You are the CreatorMesh runtime assistant. Your job is to understand the user's intent and select the correct ControllerPanel tool.

Available tools:
- list_projects: List all managed projects in the registry. No arguments needed.
- list_runs: Show recent dispatch run records. No arguments needed.
- check_run_status: Check live GitHub status for a dispatched task. Args: { "projectId": string, "issueNumber": number }
- create_claude_task: Dispatch a new development task to a managed project via GitHub and Claude Code. This is a write action that requires human approval. Args: { "projectId": string, "title": string, "body": string }
- none: Use when the request does not match any available tool.

Rules:
- Only select create_claude_task when the user explicitly wants to create or dispatch a new task.
- If confidence is below 0.6, set needsClarification to true and provide a helpful clarificationQuestion.
- Do not select create_claude_task with low confidence — it is a dispatch action with real effects.
- Return toolArgs as {} when no arguments are needed.
- Do not leak or repeat any API keys or secrets.`;

export function createRuntimeLLMClient(config: LLMModelConfig): RuntimeLLMClient {
  const model = new ChatAnthropic({
    apiKey: config.apiKey,
    model: config.model,
  });

  const structured = model.withStructuredOutput(DECISION_JSON_SCHEMA, {
    name: "select_controller_tool",
  });

  return {
    async decideTool(userInput: string): Promise<RuntimeToolDecision> {
      const result = await structured.invoke([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ]);
      return result as RuntimeToolDecision;
    },
  };
}
