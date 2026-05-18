"use client";

import { useEffect, useRef, useState } from "react";
import { ApprovalGate } from "@/components/ApprovalGate";
import { approveTurn, streamTurn } from "@/lib/api";
import type { ChatMessage, RuntimeEvent } from "@/lib/types";

// Human-readable label for each event type shown as inline progress
function eventLabel(e: RuntimeEvent): string | null {
  switch (e.type) {
    case "llm_started":       return "LLM 调用中…";
    case "intent_interpreted": return e.message ? `意图：${e.message}` : null;
    case "tool_selected":      return e.message ? `工具：${e.message}` : null;
    case "tool_started":       return e.message ? `执行：${e.message}` : null;
    case "tool_completed":     return "完成 ✓";
    case "tool_failed":        return e.message ? `错误：${e.message}` : "工具执行失败";
    default:                   return null;
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingEvents, setStreamingEvents] = useState<RuntimeEvent[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingEvents, streaming]);

  function resizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function handleSubmit() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);
    setStreamingEvents([]);

    cancelRef.current = streamTurn(
      text,
      sessionId,
      (event) => {
        setStreamingEvents((prev) => [...prev, event]);
      },
      (result) => {
        setSessionId(result.sessionId);
        setStreamingEvents([]);
        setStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: result.turnId,
            role: "assistant",
            content: result.finalResponse,
            status: result.status,
            turnId: result.turnId,
            createdAt: new Date(),
          },
        ]);
        cancelRef.current = null;
      },
      (error) => {
        setStreamingEvents([]);
        setStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `错误：${error}`,
            createdAt: new Date(),
          },
        ]);
        cancelRef.current = null;
      }
    );
  }

  async function handleApprove(
    turnId: string,
    decision: "approve" | "reject",
    feedback?: string
  ) {
    const result = await approveTurn(turnId, { decision, feedback });
    setMessages((prev) =>
      prev.map((m) =>
        m.turnId === turnId
          ? { ...m, status: result.status, content: result.finalResponse }
          : m
      )
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <p className="text-xl font-semibold">CreatorMesh</p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              告诉我你想做什么
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%]">
              <div
                className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  msg.role === "user"
                    ? { background: "var(--color-accent)", color: "#fff" }
                    : { background: "var(--color-surface)", color: "var(--color-text)" }
                }
              >
                {msg.content}
              </div>

              {msg.role === "assistant" && msg.status === "needs_approval" && msg.turnId && (
                <ApprovalGate turnId={msg.turnId} onDecide={handleApprove} />
              )}
            </div>
          </div>
        ))}

        {/* Streaming: events + bouncing dots */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              {streamingEvents.length > 0 && (
                <div
                  className="rounded-2xl px-4 py-2.5 mb-1 space-y-0.5"
                  style={{ background: "var(--color-surface)" }}
                >
                  {streamingEvents.map((e) => {
                    const label = eventLabel(e);
                    if (!label) return null;
                    return (
                      <p key={e.id} className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {label}
                      </p>
                    );
                  })}
                </div>
              )}
              <div
                className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                style={{ background: "var(--color-surface)" }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: "var(--color-muted)", animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-3 py-3 flex gap-2 items-end border-t"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
      >
        <textarea
          ref={textareaRef}
          className="flex-1 rounded-xl px-3 py-2.5 text-sm resize-none outline-none leading-snug"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            minHeight: "40px",
            maxHeight: "120px",
          }}
          placeholder="发送消息…"
          rows={1}
          value={input}
          onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || streaming}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-accent)", color: "#fff", minHeight: "40px" }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
