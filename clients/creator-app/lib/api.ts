"use client";

import type {
  ApproveRequest,
  ManagedProject,
  Plan,
  RuntimeEvent,
  RuntimeTurnResult,
  WorkflowRun,
} from "./types";

// --- Config (persisted in localStorage) ---

export function getBackendUrl(): string {
  if (typeof window === "undefined") return "http://localhost:4000";
  return localStorage.getItem("cm_backend_url") || "http://localhost:4000";
}

export function getBearerToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cm_bearer_token") || "";
}

export function saveSettings(url: string, token: string) {
  localStorage.setItem("cm_backend_url", url.trim() || "http://localhost:4000");
  localStorage.setItem("cm_bearer_token", token.trim());
}

function isMock() {
  return getBackendUrl() === "mock";
}

function authHeaders(): HeadersInit {
  const token = getBearerToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) errMsg = body.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

// --- Turn (blocking, used for approval resume) ---

export async function postTurn(
  userInput: string,
  sessionId?: string
): Promise<RuntimeTurnResult> {
  if (isMock()) return mockPostTurn(userInput);
  return apiFetch("/api/turns", {
    method: "POST",
    body: JSON.stringify({ userInput, sessionId }),
  });
}

export async function approveTurn(
  turnId: string,
  req: ApproveRequest
): Promise<RuntimeTurnResult> {
  if (isMock()) return mockApprove(turnId, req);
  return apiFetch(`/api/turns/${turnId}/approve`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// --- Turn (streaming SSE) ---
// Returns a cancel function. Fires onEvent for each intermediate event,
// onDone with final RuntimeTurnResult, onError on failure.
export function streamTurn(
  userInput: string,
  sessionId: string | undefined,
  onEvent: (event: RuntimeEvent) => void,
  onDone: (result: RuntimeTurnResult) => void,
  onError: (error: string) => void
): () => void {
  if (isMock()) {
    return mockStreamTurn(userInput, sessionId, onEvent, onDone);
  }

  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${getBackendUrl()}/api/turns/stream`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userInput, sessionId }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") onError((err as Error).message);
      return;
    }

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const b = await res.json(); if (b?.error) msg = b.error; } catch { /* */ }
      onError(msg);
      return;
    }

    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (payload["type"] === "__done__") {
              onDone(payload["result"] as RuntimeTurnResult);
              return;
            }
            if (payload["type"] === "__error__") {
              onError((payload["error"] as string) ?? "Server error");
              return;
            }
            onEvent(payload as unknown as RuntimeEvent);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") onError((err as Error).message);
    }
  })();

  return () => controller.abort();
}

// --- Health check ---

export async function checkHealth(): Promise<"connected" | "error"> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? "connected" : "error";
  } catch {
    return "error";
  }
}

// --- Data ---

export async function getRuns(): Promise<WorkflowRun[]> {
  if (isMock()) return mockRuns;
  return apiFetch("/api/runs");
}

export async function getPlans(): Promise<Plan[]> {
  if (isMock()) return mockPlans;
  return apiFetch("/api/plans");
}

export async function getProjects(): Promise<ManagedProject[]> {
  if (isMock()) return mockProjects;
  return apiFetch("/api/projects");
}

// --- Mock implementations ---

async function mockPostTurn(userInput: string): Promise<RuntimeTurnResult> {
  await delay(700);
  const needsApproval = userInput.toLowerCase().includes("dispatch") || userInput.toLowerCase().includes("创建");
  return {
    sessionId: "mock-session",
    turnId: `mock-turn-${Date.now()}`,
    status: needsApproval ? "needs_approval" : "completed",
    finalResponse: needsApproval
      ? `我准备向 idea-factory 派发任务："${userInput}"。确认继续吗？`
      : `[Mock 模式] 收到："${userInput}"。\n\n在设置中可切换到真实后端。`,
    events: [],
  };
}

function mockStreamTurn(
  userInput: string,
  _sessionId: string | undefined,
  onEvent: (event: RuntimeEvent) => void,
  onDone: (result: RuntimeTurnResult) => void
): () => void {
  let cancelled = false;
  const sid = "mock-session";
  const tid = `mock-turn-${Date.now()}`;
  const e = (type: RuntimeEvent["type"], message: string): RuntimeEvent => ({
    id: Math.random().toString(36).slice(2),
    sessionId: sid,
    turnId: tid,
    type,
    message,
    createdAt: new Date().toISOString(),
  });

  (async () => {
    await delay(200); if (cancelled) return;
    onEvent(e("llm_started", "LLM 调用中…"));
    await delay(500); if (cancelled) return;
    onEvent(e("intent_interpreted", `理解意图：${userInput}`));
    await delay(300); if (cancelled) return;
    onEvent(e("tool_selected", "选择工具：list_projects"));
    await delay(400); if (cancelled) return;
    onEvent(e("tool_started", "执行 list_projects…"));
    await delay(500); if (cancelled) return;
    onEvent(e("tool_completed", "工具完成 ✓"));
    await delay(200); if (cancelled) return;
    onDone({
      sessionId: sid,
      turnId: tid,
      status: "completed",
      finalResponse: `[Mock 模式] 收到："${userInput}"。\n在设置中配置后端地址以连接真实运行时。`,
      events: [],
    });
  })();

  return () => { cancelled = true; };
}

async function mockApprove(
  turnId: string,
  req: ApproveRequest
): Promise<RuntimeTurnResult> {
  await delay(400);
  return {
    sessionId: "mock-session",
    turnId,
    status: req.decision === "approve" ? "completed" : "blocked",
    finalResponse:
      req.decision === "approve"
        ? "任务已派发，GitHub issue 将在几秒内创建。"
        : "操作已取消。",
    events: [],
  };
}

const mockRuns: WorkflowRun[] = [
  {
    created_at: "2026-05-18T10:00:00Z",
    project_id: "idea-factory",
    repo: "CarterShi01/idea-factory",
    executor: "claude-code",
    issue_number: 11,
    issue_url: "https://github.com/CarterShi01/idea-factory/issues/11",
    title: "T04: Add CLI entry point",
    status: "merged",
    kind: "task",
  },
  {
    created_at: "2026-05-18T09:30:00Z",
    project_id: "idea-factory",
    repo: "CarterShi01/idea-factory",
    executor: "claude-code",
    issue_number: 10,
    issue_url: "https://github.com/CarterShi01/idea-factory/issues/10",
    title: "T03: Implement ranking algorithm",
    status: "merged",
    kind: "task",
  },
];

const mockPlans: Plan[] = [
  {
    created_at: "2026-05-18T08:00:00Z",
    idea_id: "2026-05-18-idea-ranking",
    primary_project_id: "idea-factory",
    plan_artifact_path: "docs/plans/2026-05-18-idea-ranking/",
    planning_issue_url: "https://github.com/CarterShi01/creator-mesh/issues/6",
    tracker_issue_url: "https://github.com/CarterShi01/idea-factory/issues/7",
    status: "dispatched",
    updated_at: "2026-05-18T10:30:00Z",
  },
];

const mockProjects: ManagedProject[] = [
  {
    id: "idea-factory",
    repo: "CarterShi01/idea-factory",
    default_branch: "main",
    executor: "claude-code",
    allow_direct_merge: false,
    allow_deploy: false,
  },
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
