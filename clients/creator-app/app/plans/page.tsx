"use client";

import { useEffect, useState } from "react";
import { getPlans } from "@/lib/api";
import type { Plan } from "@/lib/types";

const STATUS_COLOR: Record<Plan["status"], string> = {
  planning: "var(--color-muted)",
  plan_ready: "var(--color-warning)",
  dispatching: "var(--color-warning)",
  dispatched: "var(--color-accent)",
  completed: "var(--color-success)",
};

const STATUS_LABEL: Record<Plan["status"], string> = {
  planning: "规划中",
  plan_ready: "待确认",
  dispatching: "派发中",
  dispatched: "进行中",
  completed: "已完成",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlans().then((data) => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <h1 className="text-lg font-semibold mb-4">计划</h1>

      {loading && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          加载中…
        </p>
      )}

      {!loading && plans.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          还没有计划。在对话中输入"帮我规划…"来创建第一个计划。
        </p>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const color = STATUS_COLOR[plan.status];
          const label = STATUS_LABEL[plan.status];
          const date = new Date(plan.created_at).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={plan.idea_id}
              className="rounded-xl p-4"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium flex-1 leading-snug">{plan.idea_id}</p>
                <span
                  className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: color + "22", color }}
                >
                  {label}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                {plan.primary_project_id} · {date}
              </p>
              <div className="mt-3 flex gap-2">
                {plan.tracker_issue_url && (
                  <a
                    href={plan.tracker_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-lg"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    跟踪 Issue ↗
                  </a>
                )}
                {plan.planning_issue_url && (
                  <a
                    href={plan.planning_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-lg"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-muted)",
                    }}
                  >
                    规划 Issue ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
