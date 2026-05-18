"use client";

import { useEffect, useState } from "react";
import { getBearerToken, getBackendUrl, saveSettings, checkHealth } from "@/lib/api";

type ConnStatus = "checking" | "connected" | "error" | "mock";

export default function SettingsPage() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>("checking");

  useEffect(() => {
    const savedUrl = getBackendUrl();
    setUrl(savedUrl === "mock" ? "" : savedUrl);
    setToken(getBearerToken());
  }, []);

  // Ping health whenever url field changes (debounced)
  useEffect(() => {
    const target = url.trim() || "http://localhost:4000";
    if (target === "mock") { setConnStatus("mock"); return; }
    setConnStatus("checking");
    const t = setTimeout(async () => {
      const status = await checkHealth();
      setConnStatus(status);
    }, 600);
    return () => clearTimeout(t);
  }, [url]);

  function handleSave() {
    saveSettings(url.trim() || "http://localhost:4000", token.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const statusDot: Record<ConnStatus, { color: string; label: string }> = {
    checking:  { color: "var(--color-warning)", label: "检查中…" },
    connected: { color: "var(--color-success)", label: "已连接 ✓" },
    error:     { color: "var(--color-danger)",  label: "连接失败 ✗" },
    mock:      { color: "var(--color-muted)",   label: "Mock 模式" },
  };
  const dot = statusDot[connStatus];

  return (
    <div className="h-full overflow-y-auto px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold mb-6">设置</h1>

      <section className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">后端地址</label>
            <span className="text-xs flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: dot.color }}
              />
              <span style={{ color: dot.color }}>{dot.label}</span>
            </span>
          </div>
          <input
            type="url"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            placeholder="http://localhost:4000"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            留空则使用 <code>http://localhost:4000</code>。输入 <code>mock</code> 强制使用 Mock 模式。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Bearer Token</label>
          <input
            type="password"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-mono"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            placeholder="（可选）your-secret-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: saved ? "var(--color-success)" : "var(--color-accent)",
            color: "#fff",
          }}
        >
          {saved ? "已保存 ✓" : "保存"}
        </button>
      </section>

      <hr className="my-6" style={{ borderColor: "var(--color-border)" }} />

      <section>
        <h2 className="text-sm font-medium mb-3">iOS 安装</h2>
        <div
          className="rounded-xl p-4 text-sm space-y-2"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p>在 Safari 中打开本页后：</p>
          <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: "var(--color-muted)" }}>
            <li>点击底部分享按钮</li>
            <li>选择"添加到主屏幕"</li>
            <li>从主屏图标启动，全屏体验</li>
          </ol>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium mb-3">启动 server</h2>
        <div
          className="rounded-xl p-4 text-xs font-mono space-y-1"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
        >
          <p>cd /path/to/creator-mesh</p>
          <p>export ANTHROPIC_API_KEY=sk-ant-xxx</p>
          <p>npm run server</p>
        </div>
      </section>
    </div>
  );
}
