"use client";

import { useEffect, useState } from "react";
import { getRuns } from "@/lib/api";
import { RunCard } from "@/components/RunCard";
import type { WorkflowRun } from "@/lib/types";

export default function RunsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRuns().then((data) => {
      setRuns(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <h1 className="text-lg font-semibold mb-4">运行记录</h1>

      {loading && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          加载中…
        </p>
      )}

      {!loading && runs.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          还没有运行记录。
        </p>
      )}

      <div className="space-y-3">
        {runs.map((run, i) => (
          <RunCard key={run.issue_url + i} run={run} />
        ))}
      </div>
    </div>
  );
}
