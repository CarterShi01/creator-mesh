# Desktop Shell Runbook — CreatorMesh Console

This document covers how to develop, build, and run the Tauri macOS desktop shell for CreatorMesh Console.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Cargo | (bundled with Rust) | — |
| Xcode Command Line Tools | latest | `xcode-select --install` |

Check:
```bash
rustc --version
cargo --version
node --version
```

---

## First-Time Setup

```bash
# 1. Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 2. Install Node dependencies
cd clients/creator-console
npm install
```

---

## Development

### Web dev server (no Rust needed)
```bash
cd clients/creator-console
npm run dev
# Open http://localhost:5173
```

### Tauri dev (opens native window, requires Rust)
```bash
cd clients/creator-console
npm run tauri:dev
# Starts Vite dev server + Tauri window
# Native DevTools open in debug mode
```

---

## Production Build

### Web build
```bash
cd clients/creator-console
npm run build
# Output: dist/
```

### macOS app bundle (requires Rust)
```bash
cd clients/creator-console
npm run tauri:build
# Output: src-tauri/target/release/bundle/macos/CreatorMesh Console.app
#         src-tauri/target/release/bundle/dmg/CreatorMesh Console_*.dmg
```

First build may take 5–15 minutes (Cargo downloads and compiles Tauri dependencies).

---

## Artifact Locations

| Artifact | Path |
|---|---|
| Web dist | `clients/creator-console/dist/` |
| Service worker | `clients/creator-console/dist/sw.js` |
| Tauri binary | `clients/creator-console/src-tauri/target/release/creator-console` |
| macOS .app | `clients/creator-console/src-tauri/target/release/bundle/macos/CreatorMesh Console.app` |
| macOS .dmg | `clients/creator-console/src-tauri/target/release/bundle/dmg/CreatorMesh Console_*.dmg` |

---

## Native Commands (Tauri Bridge)

All native commands are safe and read-only:

| Command | Return |
|---|---|
| `get_app_version` | Package version string |
| `get_platform_label` | "macOS Desktop" / "Windows Desktop" / "Linux Desktop" |
| `get_desktop_capabilities` | `{ localShell: false, filesystem: false, governedWorkflowApi: false }` |

Commands are invoked via `window.__TAURI__.core.invoke()` from the web client.
In web/PWA mode, `desktopBridge.ts` returns safe mock values without invoking Tauri.

---

## App Configuration

`src-tauri/tauri.conf.json`:

| Setting | Value |
|---|---|
| productName | CreatorMesh Console |
| identifier | com.creatormesh.console |
| window title | CreatorMesh Console |
| default size | 1280 × 820 |
| minimum size | 900 × 640 |
| withGlobalTauri | true (exposes window.__TAURI__) |

---

## What Is Intentionally Disabled

- No Tauri filesystem plugin
- No Tauri shell plugin
- No auto-updater
- No code signing or notarization
- No tray icon
- No deep link handling

These will be evaluated and added in future phases only when needed and safe.

---

## Troubleshooting

**`cargo` not found after install:**
```bash
source ~/.cargo/env
# or restart your terminal
```

**Build fails with "could not find Xcode":**
```bash
xcode-select --install
```

**`tauri:build` fails with linker error on macOS:**
- Ensure Xcode Command Line Tools are installed
- Try: `sudo xcode-select --reset`

**Service worker not registering in dev:**
- Expected — `devOptions.enabled` is set to `false` in vite.config.ts
- Run `npm run build && npm run preview` to test service worker in a production-like environment

---

## Next Steps

1. Install Rust and run `npm run tauri:build` to produce the first .app bundle
2. Integrate governed API boundary (POST /api/runs)
3. Connect LocalWorkflowRunner through HTTP API
4. Add RunLedger for run history persistence
5. Evaluate Tauri filesystem plugin for draft storage (Phase 4+)
