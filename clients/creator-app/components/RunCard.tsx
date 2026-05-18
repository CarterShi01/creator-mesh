import type { WorkflowRun } from "@/lib/types";

interface Props {
  run: WorkflowRun;
}

const STATUS_COLOR: Record<string, string> = {
  merged: "var(--color-success)",
  dispatched: "var(--color-warning)",
  workflow_failed: "var(--color-danger)",
  pr_closed_without_merge: "var(--color-danger)",
};

const STATUS_LABEL: Record<string, string> = {
  merged: "已合并",
  dispatched: "进行中",
  workflow_failed: "失败",
  pr_closed_without_merge: "PR 关闭",
};

export function RunCard({ run }: Props) {
  const color = STATUS_COLOR[run.status] ?? "var(--color-muted)";
  const label = STATUS_LABEL[run.status] ?? run.status;
  const date = new Date(run.created_at).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <a
      href={run.issue_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 transition-opacity active:opacity-70"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug flex-1">{run.title}</p>
        <span
          className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: color + "22", color }}
        >
          {label}
        </span>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
        {run.project_id} · #{run.issue_number} · {date}
      </p>
    </a>
  );
}
