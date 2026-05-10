import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

import { LocalWorkflowRunner } from "./workflows/local-runner.js";
import { Orchestrator } from "./orchestrator/orchestrator.js";
import { ThoughtAgent, AnthropicThoughtClient } from "./agents/thought-agent.js";
import type { ThoughtClassification } from "./agents/thought-agent.js";
import { NotionConnectorAdapter } from "./connectors/notion/adapter.js";
import type { NotionPageData } from "./connectors/notion/normalize.js";
import { thoughtToNoteWorkflow } from "./workflows/definitions/thought-to-note.js";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is not set.`);
    process.exit(1);
  }
  return val;
}

function parseArgs(): { thought: string; parent: string } {
  const args = process.argv.slice(2);
  let thought = "";
  let parent = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--thought" && args[i + 1]) thought = args[++i];
    else if (args[i] === "--parent" && args[i + 1]) parent = args[++i];
  }
  return { thought, parent };
}

async function main() {
  const anthropicApiKey = requireEnv("ANTHROPIC_API_KEY");
  const notionApiKey = requireEnv("NOTION_API_KEY");

  const { thought: thoughtArg, parent: parentArg } = parseArgs();
  const thought = thoughtArg || "";
  const notionParentId = parentArg || process.env["NOTION_PARENT_ID"] || "";

  if (!thought) {
    console.error('Error: --thought "<your thought>" is required.');
    console.error(
      'Usage: npm run think -- --thought "<thought>" [--parent <notion-page-id>]'
    );
    process.exit(1);
  }
  if (!notionParentId) {
    console.error("Error: --parent <notion-page-id> or NOTION_PARENT_ID env var is required.");
    process.exit(1);
  }

  const thoughtAgent = new ThoughtAgent(new AnthropicThoughtClient(anthropicApiKey));
  const notionConnector = new NotionConnectorAdapter({
    connectorId: "notion",
    apiKey: notionApiKey,
  });

  const orchestrator = new Orchestrator(
    new Map([["thought-agent", thoughtAgent]]),
    new Map([["notion", notionConnector]]),
    new Map()
  );

  const runner = new LocalWorkflowRunner(orchestrator);

  console.log("\nClassifying thought...");
  let result = await runner.execute(thoughtToNoteWorkflow, { thought, notionParentId });

  if (result.status === "paused" && result.pausedAt) {
    const runId = result.runId;

    const runStatus = await runner.status(runId);
    const classifyRecord = runStatus.stepHistory.find((r) => r.stepId === "classify");
    if (classifyRecord?.output) {
      const c = classifyRecord.output as ThoughtClassification;
      console.log("\n--- Classification ---");
      console.log(`  Category:  ${c.category}`);
      console.log(`  Title:     ${c.suggestedTitle}`);
      console.log(`  Summary:   ${c.summary}`);
      console.log(`  Tags:      ${c.tags.join(", ")}`);
      console.log(`  Confidence:${(c.confidence * 100).toFixed(0)}%`);
    }

    console.log(`\n${result.pausedAt.prompt}`);
    console.log(`  [y] ${result.pausedAt.acceptLabel}`);
    console.log(`  [n] ${result.pausedAt.rejectLabel}`);

    const rl = createInterface({ input, output });
    let decision: "accept" | "reject" = "reject";
    try {
      const answer = await rl.question("\nApprove? [y/n]: ");
      decision = answer.trim().toLowerCase() === "y" ? "accept" : "reject";
    } finally {
      rl.close();
    }

    if (decision === "reject") {
      console.log("\nRejected. No changes made to Notion.");
      process.exit(0);
    }

    console.log("\nResuming workflow...");
    result = await runner.resume(runId, { decision });
  }

  if (result.status === "completed") {
    const notionPage = (result.output as Record<string, unknown> | undefined)?.[
      "write-notion"
    ] as NotionPageData | undefined;
    if (notionPage?.url) {
      console.log(`\nNotion page created: ${notionPage.url}`);
    } else {
      console.log("\nWorkflow completed.");
    }
  } else if (result.status === "failed") {
    console.error(`\nWorkflow failed: ${result.error ?? "unknown error"}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
