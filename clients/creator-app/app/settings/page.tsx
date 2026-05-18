"use client";

import { useEffect, useState } from "react";
import { getBearerToken, getBackendUrl, saveSettings } from "@/lib/api";

export default function SettingsPage() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrl(getBackendUrl() === "mock" ? "" : getBackendUrl());
    setToken(getBearerToken());
  }, []);

  function handleSave() {
    saveSettings(url.trim() || "mock", token.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold mb-6">设置</h1>

      <section className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">后端地址</label>
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
            留空则使用 Mock 模式（无需后端）
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
            placeholder="your-secret-token"
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
        <h2 className="text-sm font-medium mb-3">当前状态</h2>
        <div
          className="rounded-xl p-4 text-xs space-y-1 font-mono"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-muted)",
          }}
        >
          <p>模式: {url ? "连接后端" : "Mock"}</p>
          <p>后端: {url || "(未配置)"}</p>
          <p>Token: {token ? "已设置" : "(未设置)"}</p>
        </div>
      </section>
    </div>
  );
}
