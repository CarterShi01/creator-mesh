/**
 * CreatorMesh Decompose CLI
 *
 * Drives the multi-role idea decomposition pipeline (PM → Architect → Planner → OP).
 *
 * Usage:
 *   tsx src/decompose-cli.ts decompose --idea-id 2026-05-18-test --brief "Build a creator app"
 *   tsx src/decompose-cli.ts resume --run-id <runId> --decision accept
 *
 * npm script:
 *   npm run decompose -- decompose --idea-id test --brief "my idea"
 */
import { readFileSync, promises as fsPromises } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

// Load .env from project root (no extra dependency needed)
try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const lines = readFileSync(path.join(root, ".env"), "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (!(key in process.env)) {
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2").trim();
    }
  }
} catch { /* .env not required */ }

import { TreeWorkflowRunner } from "./workflows/tree-runner.js";
import { Runtime } from "./runtime/runtime.js";
import { ideaDecomposeWorkflow } from "./workflows/definitions/idea-decompose.js";
import { PMAgent } from "./agents/pm-agent.js";
import { ArchitectAgent } from "./agents/architect-agent.js";
import { PlannerAgent } from "./agents/planner-agent.js";
import { OPAgent } from "./agents/op-agent.js";
import { FeatureCollectorAgent } from "./agents/feature-collector-agent.js";
import { CreatorMeshLLMClient } from "./agents/llm-client.js";
import { FilesystemConnectorAdapter } from "./capabilities/connectors/filesystem/adapter.js";
import type { WorkflowResult } from "./workflows/port.js";
import type { AgentRole } from "./agents/port.js";
import type { ConnectorPort } from "./capabilities/connectors/port.js";

const PLANS_DIR = "docs/plans";

// In-memory store for paused runs across CLI invocations would need a DB.
// For Phase A, we print the runId so the user can resume with a second command.
const runnerStore = new Map<string, TreeWorkflowRunner>();

function buildRunner(): { runner: TreeWorkflowRunner } {
  const llm = new CreatorMeshLLMClient();
  const fs = new FilesystemConnectorAdapter({ baseDir: process.cwd() });

  const agentRoles: Map<string, AgentRole> = new Map();
  agentRoles.set("pm", new PMAgent(llm));
  agentRoles.set("architect", new ArchitectAgent(llm));
  agentRoles.set("planner", new PlannerAgent(llm));
  agentRoles.set("op", new OPAgent(llm));
  agentRoles.set("feature-collector", new FeatureCollectorAgent());

  const connectors: Map<string, ConnectorPort> = new Map([
    ["filesystem", fs],
  ]);

  const runtime = new Runtime(agentRoles, connectors, new Map());

  const runner = new TreeWorkflowRunner(runtime);
  return { runner };
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i]?.startsWith("--") && args[i + 1]) {
      const key = args[i]!.slice(2);
      result[key] = args[i + 1]!;
      i++;
    }
  }
  return result;
}

async function printResult(result: WorkflowResult): Promise<void> {
  if (result.status === "paused" && result.pausedAt) {
    console.log("\n── Human Review Required ──────────────────────────────");
    console.log(`Step: ${result.pausedAt.stepId}`);
    console.log(`\n${result.pausedAt.prompt}`);
    console.log(`\n  [y] ${result.pausedAt.acceptLabel}`);
    console.log(`  [n] ${result.pausedAt.rejectLabel}`);
    console.log("\nRun ID:", result.runId);
    console.log("Resume: npm run decompose -- resume --run-id", result.runId, "--decision accept");
  } else if (result.status === "completed") {
    console.log("\n✓ Step completed successfully.");
  } else if (result.status === "failed") {
    console.error("\n✗ Failed:", result.error);
  }
}

async function cmdDecompose(flags: Record<string, string>): Promise<void> {
  const ideaId = flags["idea-id"];
  if (!ideaId) { console.error("Missing --idea-id"); process.exit(1); }

  let brief = flags["brief"] ?? "";
  if (!brief && flags["brief-file"]) {
    brief = await fsPromises.readFile(flags["brief-file"], "utf-8");
  }
  if (!brief) { console.error("Missing --brief or --brief-file"); process.exit(1); }

  const repos = flags["repos"] ? flags["repos"].split(",") : ["idea-factory", "creator-mesh"];

  console.log(`\nDecomposing idea: ${ideaId}`);
  console.log(`PM → Architect → Planner → OP\n`);

  const { runner } = buildRunner();
  runnerStore.set("current", runner);

  const result = await runner.execute(ideaDecomposeWorkflow, {
    ideaId,
    brief,
    repos,
    plansDir: PLANS_DIR,
  });

  await printResult(result);

  if (result.status === "paused") {
    const answer = await prompt("\nApprove this step? [y/n]: ");
    if (answer.trim().toLowerCase() === "y") {
      const resumed = await runner.resume(result.runId, { decision: "accept" });
      await printResult(resumed);
    } else {
      console.log("Rejected. Pipeline stopped.");
    }
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseArgs(rest);

  if (cmd === "decompose") {
    await cmdDecompose(flags);
  } else {
    console.error(`Unknown command: ${cmd ?? "(none)"}`);
    console.error("Usage: tsx src/decompose-cli.ts decompose --idea-id <id> --brief <text>");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
