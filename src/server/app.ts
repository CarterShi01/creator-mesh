import { Hono } from "hono";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import { runRuntimeTurn, callToolWithApproval } from "../runtime/loop/runtime-loop.js";
import type { RuntimeToolName } from "../runtime/tools/controller-tools.js";
import { savePending, getPending, deletePending } from "./pending.js";
import { getRuns, getPlans, getProjects } from "./data.js";

export function createApp() {
  const app = new Hono();

  // CORS — allow the frontend dev server and any configured origin
  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Bearer auth — only enforced when CREATORMESH_API_TOKEN is set
  const token = process.env["CREATORMESH_API_TOKEN"];
  if (token) {
    app.use("/api/*", bearerAuth({ token }));
  }

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() })
  );

  // ── Data endpoints (read-only) ────────────────────────────────────────────
  app.get("/api/runs", async (c) => c.json(await getRuns()));
  app.get("/api/plans", async (c) => c.json(await getPlans()));
  app.get("/api/projects", async (c) => c.json(await getProjects()));

  // ── Turn: send a message to the LLM runtime ───────────────────────────────
  app.post("/api/turns", async (c) => {
    let body: { userInput?: string; sessionId?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const userInput = body.userInput?.trim();
    if (!userInput) return c.json({ error: "userInput is required" }, 400);

    const result = await runRuntimeTurn({ userInput, sessionId: body.sessionId });

    // If the runtime is waiting for human approval, cache the pending state
    if (
      result.status === "needs_approval" &&
      result.selectedToolName &&
      result.selectedToolName !== "none"
    ) {
      savePending({
        turnId: result.turnId,
        sessionId: result.sessionId,
        toolName: result.selectedToolName as RuntimeToolName,
        toolArgs: result.selectedToolArgs ?? {},
        createdAt: new Date(),
      });
    }

    return c.json(result);
  });

  // ── Approve / reject a pending turn ──────────────────────────────────────
  app.post("/api/turns/:turnId/approve", async (c) => {
    const { turnId } = c.req.param();
    let body: { decision?: string; feedback?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (body.decision !== "approve" && body.decision !== "reject") {
      return c.json({ error: 'decision must be "approve" or "reject"' }, 400);
    }

    const pending = getPending(turnId);
    if (!pending) {
      return c.json({ error: "No pending approval found for this turn" }, 404);
    }

    deletePending(turnId);

    if (body.decision === "reject") {
      return c.json({
        sessionId: pending.sessionId,
        turnId: pending.turnId,
        status: "blocked",
        finalResponse: body.feedback ? `Rejected: ${body.feedback}` : "Action cancelled.",
        events: [],
      });
    }

    const result = await callToolWithApproval(
      pending.toolName,
      pending.toolArgs,
      pending.sessionId
    );
    return c.json(result);
  });

  return app;
}
