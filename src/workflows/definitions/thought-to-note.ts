import type { WorkflowDefinition } from "../port.js";
import type { AgentStep, HumanReviewStep, ConnectorStep } from "../types.js";

const classifyStep: AgentStep = {
  stepId: "classify",
  name: "Classify Thought",
  type: "agent",
  description:
    "Delegate raw Thought to ThoughtAgent for classification and structuring.",
  agentRole: "thought-agent",
  inputMapping: {
    thought: "$input.thought",
  },
  outputKey: "structuredThought",
  onSuccess: "review-classification",
  onFailure: "fail",
};

const reviewStep: HumanReviewStep = {
  stepId: "review-classification",
  name: "Review Classification",
  type: "human-review",
  description:
    "Creator reviews the ThoughtAgent classification before writing to Notion.",
  prompt:
    "The thought has been classified. Does the structure look correct? Approve to write to Notion, or reject to stop.",
  acceptLabel: "Looks correct — write to Notion",
  rejectLabel: "Not right — stop here",
  onAccept: "write-notion",
  onReject: "fail",
  onSuccess: "write-notion",
  onFailure: "fail",
};

const writeNotionStep: ConnectorStep = {
  stepId: "write-notion",
  name: "Write Structured Note to Notion",
  type: "connector",
  description:
    "Create a new Notion page containing the structured thought. Requires explicit creator approval per governance checkpoint.",
  connectorId: "notion",
  capabilityType: "create",
  resourceType: "page",
  inputMapping: {
    title: "$steps.classify.suggestedTitle",
    parent: "$input.notionParentId",
    content: "$steps.classify.summary",
  },
  outputKey: "notionPage",
  onSuccess: "complete",
  onFailure: "fail",
  requiresApproval: true,
};

export const thoughtToNoteWorkflow: WorkflowDefinition = {
  workflowId: "thought-to-note",
  name: "Thought to Structured Note",
  version: "0.1.0",
  description:
    "Normalize a raw Thought into a structured note and write it to Notion. " +
    "Includes human review before any external write. " +
    "Non-destructive: creates a new page only, never modifies or deletes existing content.",
  inputSchema: {
    thought: "Thought",
    notionParentId: "string",
  },
  steps: [classifyStep, reviewStep, writeNotionStep],
  governanceCheckpoints: [
    {
      stepId: "write-notion",
      approvalRequirement: "always",
      reason:
        "Writing to Notion is an external side effect. " +
        "Every Notion write requires explicit creator approval, " +
        "regardless of the connector's default approval level.",
    },
  ],
  tags: ["thought", "notion", "knowledge"],
};
