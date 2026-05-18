/**
 * CreatorMesh Runtime CLI
 *
 * Single-shot:  tsx src/runtime-cli.ts "show recent runs"
 * Interactive:  tsx src/runtime-cli.ts
 * npm script:   npm run runtime -- "show recent runs"
 */
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { runRuntimeTurn, callToolWithApproval } from "./runtime/loop/runtime-loop.js";
import type { RuntimeTurnResult } from "./runtime/loop/runtime-loop.js";

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function handleApproval(result: RuntimeTurnResult): Promise<void> {
  if (result.status !== "needs_approval" || !result.selectedToolName) return;

  console.log("\nProposed action:");
  console.log(`  Tool: ${result.selectedToolName}`);
  if (result.selectedToolArgs && Object.keys(result.selectedToolArgs).length > 0) {
    for (const [k, v] of Object.entries(result.selectedToolArgs)) {
      console.log(`  ${k}: ${String(v)}`);
    }
  }

  const answer = await prompt("\nConfirm? [y/n]: ");
  if (answer.trim().toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  console.log("\nDispatching...");
  const approved = await callToolWithApproval(
    result.selectedToolName,
    result.selectedToolArgs ?? {},
    result.sessionId
  );
  console.log(approved.finalResponse);
}

async function runTurn(userInput: string): Promise<void> {
  const result = await runRuntimeTurn({ userInput });
  console.log("\n" + result.finalResponse);
  await handleApproval(result);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    await runTurn(args.join(" "));
    return;
  }

  // Interactive REPL
  console.log("CreatorMesh Runtime  (Ctrl+C to exit)\n");
  const rl = createInterface({ input, output });
  rl.on("SIGINT", () => { console.log("\nBye."); process.exit(0); });

  for await (const line of rl) {
    const userInput = line.trim();
    if (userInput) await runTurn(userInput);
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
