#!/usr/bin/env tsx
/**
 * Idempotent importer: pulls data from existing JSONL/YAML runtime files and
 * docs/plans/ into the SQLite database.
 *
 * Usage:
 *   CREATORMESH_DB_PATH=/path/to/db.sqlite npx tsx src/storage/import/import-cli.ts
 *   npx tsx src/storage/import/import-cli.ts --projects /path/to/projects.yaml
 */

import { openDb } from "../sqlite/db.js";
import { SqliteManagedProjectStore } from "../sqlite/managed-project-store-sqlite.js";
import { SqliteWorkflowDefinitionStore } from "../sqlite/workflow-definition-store-sqlite.js";
import { SqliteWorkflowRunStore } from "../sqlite/workflow-run-store-sqlite.js";
import { SqliteRelationStore } from "../sqlite/relation-store-sqlite.js";
import { importFromJsonl } from "./import-from-jsonl.js";

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const dbPath = getArg("--db");
const projectsFile = getArg("--projects");
const runsFile = getArg("--runs");
const plansIndexFile = getArg("--plans-index");
const plansArtifactDir = getArg("--plans-dir");

const db = openDb(dbPath);
const result = importFromJsonl(
  new SqliteManagedProjectStore(db),
  new SqliteWorkflowDefinitionStore(db),
  new SqliteWorkflowRunStore(db),
  new SqliteRelationStore(db),
  { projectsFile, runsFile, plansIndexFile, plansArtifactDir }
);

console.log("Import complete:");
console.log(`  Managed projects:    ${result.projects}`);
console.log(`  Plan definitions:    ${result.planDefinitions}`);
console.log(`  Task definitions:    ${result.taskDefinitions}`);
console.log(`  Task runs:           ${result.taskRuns}`);
console.log(`  Plan runs:           ${result.planRuns}`);
console.log(`  Relations:           ${result.relations}`);
