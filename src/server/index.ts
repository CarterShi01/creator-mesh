/**
 * CreatorMesh HTTP Server
 *
 * Start: tsx src/server/index.ts
 * Or:    npm run server
 *
 * Env vars:
 *   PORT                    — default 4000
 *   CREATORMESH_API_TOKEN   — if set, all /api/* requests require Bearer auth
 *   ANTHROPIC_API_KEY       — required for /api/turns (LLM calls)
 *   CREATORMESH_RUNTIME_DIR — default ~/creator-mesh-runtime
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

// Load .env from project root if present
try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const lines = readFileSync(path.join(root, ".env"), "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (!(key in process.env))
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2").trim();
  }
} catch { /* .env not required */ }

const PORT = Number(process.env["PORT"] ?? 4000);
const app = createApp();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`CreatorMesh server running on http://localhost:${PORT}`);
  console.log(`  Auth: ${process.env["CREATORMESH_API_TOKEN"] ? "Bearer token required" : "none (set CREATORMESH_API_TOKEN to enable)"}`);
  console.log(`  LLM:  ${process.env["ANTHROPIC_API_KEY"] ? "ANTHROPIC_API_KEY set ✓" : "ANTHROPIC_API_KEY missing — /api/turns will fail"}`);
});
