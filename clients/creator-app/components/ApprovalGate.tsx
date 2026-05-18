"use client";

import { useState } from "react";

interface Props {
  turnId: string;
  onDecide: (turnId: string, decision: "approve" | "reject", feedback?: string) => Promise<void>;
}

export function ApprovalGate({ turnId, onDecide }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handle(decision: "approve" | "reject") {
    setLoading(decision);
    await onDecide(turnId, decision, feedback || undefined);
    setLoading(null);
    setShowFeedback(false);
  }

  return (
    <div
      className="mt-2 rounded-xl p-3 flex flex-col gap-2"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        需要你的确认才能继续
      </p>

      {showFeedback && (
        <textarea
          className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
          placeholder="说明原因或修改意见（可选）"
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handle("approve")}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-success)", color: "#fff" }}
        >
          {loading === "approve" ? "处理中…" : "✓ 同意"}
        </button>

        <button
          onClick={() => setShowFeedback((v) => !v)}
          disabled={loading !== null}
          className="py-2 px-3 rounded-lg text-sm transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          ✎ 改一下
        </button>

        <button
          onClick={() => handle("reject")}
          disabled={loading !== null}
          className="py-2 px-3 rounded-lg text-sm transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-danger)", color: "var(--color-danger)" }}
        >
          {loading === "reject" ? "…" : "✗"}
        </button>
      </div>
    </div>
  );
}
