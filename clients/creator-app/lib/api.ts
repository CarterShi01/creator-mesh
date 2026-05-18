"use client";

import type {
  ApproveRequest,
  ManagedProject,
  Plan,
  RuntimeTurnResult,
  WorkflowRun,
} from "./types";

// --- Config (persisted in localStorage) ---

export function getBackendUrl(): string {
  if (typeof window === "undefined") return "mock";
  return localStorage.getItem("cm_backend_url") || "mock";
}

export function getBearerToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cm_bearer_token") || "";
}

export function saveSettings(url: string, token: string) {
  localStorage.setItem("cm_backend_url", url);
  localStorage.setItem("cm_bearer_token", token);
}

function isMock() {
  return getBackendUrl() === "mock" || getBackendUrl() === "";
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
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// --- Turn (LLM conversation) ---

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
      : `[Mock 模式] 收到："${userInput}"。\n\n在设置中配置后端地址以连接真实运行时。`,
    events: [],
  };
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
  {
    created_at: "2026-05-18T08:00:00Z",
    project_id: "idea-factory",
    repo: "CarterShi01/idea-factory",
    executor: "claude-code",
    issue_number: 8,
    issue_url: "https://github.com/CarterShi01/idea-factory/issues/8",
    title: "T01: Scaffold project structure",
    status: "dispatched",
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
