# CreatorMesh Session Bridge Architecture

## Overview

The Session Bridge is CreatorMesh's multi-surface coordination layer. It enables one surface (e.g., a Mac Desktop App) to act as a local Runtime Host while other surfaces (Mobile, Web, PWA) act as Remote Controllers.

This architecture mirrors the Claude Code remote control model: a local runtime host does the heavy work, and lightweight surfaces send commands and receive status updates.

---

## Current State — Phase A: In-Memory Mock Bridge

All session bridge functionality is local, in-process, and mock-only.

```
Browser / PWA / Mac Desktop (single process)
  ├── RuntimeClient interface  (src/runtime/client.ts)
  │     └── getRuntimeClient() singleton factory  (src/runtime/workflowClient.ts)
  │           └── MockRuntimeClient  (src/runtime/mock/mockClient.ts)
  │                 └── RunLedger    (src/runtime/mock/runLedger.ts — in-memory)
  ├── SessionClient interface  (src/session/client.ts)
  │     └── MockSessionBridge  (src/session/mockSessionBridge.ts — in-memory event bus)
  │           ├── SessionStore (src/session/sessionStore.ts — in-memory sessions, surfaces, events)
  │           └── dispatches RemoteControlCommands → RuntimeClient (shared singleton)
  ├── Surface detection        (src/surface/detector.ts)
  └── UI Panels
        ├── DesktopHostPanel   — Host Mode UI
        ├── MobileRemotePanel  — Controller Mode UI
        ├── ConnectedSurfacesPanel
        └── SessionEventLog
```

**Safety guarantees (Phase A):**
- No network ports opened
- No filesystem access
- No shell command execution
- No real Anthropic or Notion calls
- No real Tauri native command execution beyond read-only capabilities already defined
- All state is in-memory and isolated to the browser tab

---

## Future Phases

### Phase B — Local Desktop Runtime API

The Mac Desktop App (Tauri) hosts a local HTTP API that serves as the Runtime Host.

```
Mac Desktop App (Tauri)
  ├── Local HTTP server (e.g., localhost:4747, LAN-only)
  │     └── POST /api/runs        → LocalWorkflowRunner
  │     └── POST /api/runs/:id/resume
  │     └── GET  /api/runs/:id
  │     └── GET  /api/health
  │     └── GET  /api/events (SSE)
  └── Governance layer (GovernanceEvaluator) — enforced server-side
        └── ALL external side effects require prior HumanReview

Web/PWA/Mobile (same device or LAN)
  └── LocalRuntimeClient (replaces MockRuntimeClient)
        └── fetch(localhost:4747/api/…)
```

**Why the Desktop App acts as the host:**
- Local filesystem access requires the native shell
- Local Claude Code runner requires subprocess execution
- Mobile and web browsers cannot safely execute local commands
- GovernanceEvaluator enforces approval before side effects — it must run on the host

**Implementation path:**
1. Implement `LocalRuntimeClient` following `src/runtime/localRuntimeClient.placeholder.ts` (Option A: HTTP)
2. Add a local HTTP server to the Tauri backend (`src-tauri/src/main.rs`)
3. Enforce governance on every connector/runner action before execution
4. Bind to `127.0.0.1` only — never expose to public internet

---

### Phase C — LAN Pairing Bridge (Optional)

A short-lived pairing mechanism allows a mobile device on the same LAN to connect to the Desktop Host.

```
Mac Desktop App (host, LAN IP: 192.168.1.x:4747)
  └── Pairing: displays QR code or 6-char code
  └── Accepts connections from LAN devices only
  └── Short-lived pairing token (TTL: 5 min)
  └── Host must explicitly consent to each pairing

Mobile App (controller, same LAN)
  └── Scans QR or enters pairing code
  └── Receives session ID + ephemeral token
  └── Sends RemoteControlCommands to host
  └── Subscribes to host SSE for live run status
```

**Security principles for Phase C:**
- Binding to LAN only (no public exposure)
- Pairing token expires after 5 minutes
- Host must initiate pairing (no unsolicited connections)
- All commands are subject to GovernanceEvaluator on the host
- Mobile controller cannot bypass human review boundary
- All remote commands are audit-logged

---

### Phase D — Secure Cloud Relay (Optional)

A cloud relay enables remote control from outside the LAN (e.g., phone away from home).

```
Mac Desktop App ←→ CreatorMesh Cloud Relay ←→ Mobile App
  └── E2E encrypted tunnel
  └── Desktop authenticates with relay on startup
  └── Mobile authenticates with pairing token (QR/code)
  └── Relay forwards commands — never inspects payload
  └── Host can revoke access at any time
```

**Why not Phase A/B:**
- Requires auth infrastructure (user accounts or device keys)
- Requires TLS certificate management
- Increases attack surface — defer until governance and audit trail are solid

---

### Phase E — Push Notifications and Background Status (Optional)

Mobile devices receive push notifications when a run is paused for human review.

```
Mac Desktop App
  └── Run paused at HumanReviewStep
  └── Sends push notification via relay → Mobile App
  └── Mobile user opens app and reviews without being at the Mac

Mobile App
  └── Receives push (APNs / FCM)
  └── Displays review prompt
  └── Sends accept/reject via Session Bridge
```

**Why defer:**
- Requires APNs/FCM registration
- Requires background-capable Capacitor plugin
- Must not reveal workflow content in notification payload (privacy)

---

## Security Principles (All Phases)

1. **No unauthenticated remote control.** Phase A: single-process, no auth needed. Phase B+: pairing token required.
2. **Short-lived pairing tokens.** Default TTL: 5 minutes. Non-renewable without host re-initiation.
3. **Explicit host consent.** Host must start pairing. Controllers cannot join without host action.
4. **All external side effects go through governance.** GovernanceEvaluator runs on the host side, never on the controller. Controllers only request actions.
5. **No direct command execution from mobile.** Mobile sends `RemoteControlCommand.type` (e.g., `accept_review`). Host evaluates, then dispatches to the runtime.
6. **Audit all remote commands.** Every `RemoteControlCommand` is written to `SessionEventLog` and, in Phase B+, to the `AuditRecord` store.
7. **Human Review is the approval boundary.** No write, destructive, or external-side-effect action can complete without a prior `human.accepted` decision — enforced on the host, not the controller.

---

## Why Mobile Should Not Directly Run Local Runners

- Local runners (Claude Code CLI, Notion API) require file system, subprocess, and credential access
- Mobile browsers and Capacitor shells are sandboxed — they cannot safely hold API keys or spawn processes
- Even if they could, bypassing the governance layer would violate the CreatorMesh safety model
- The correct model: mobile is a _control surface_, not an _execution surface_

---

## File Map (Current Phase A)

### Surface Module (`src/surface/`)
| File | Purpose |
|---|---|
| `src/surface/types.ts` | Canonical `SurfaceKind` (web\|pwa\|tauri\|capacitor\|unknown), `SurfaceRole`, `SurfaceInfo`, `SurfaceCapabilities` |
| `src/surface/detector.ts` | `detectSurface()`, `detectSurfaceKind()`, `isDesktopSurface()`, `isMobileSurface()` |
| `src/surface/tauriBridge.ts` | Desktop-native commands: `getAppVersion()`, `getPlatformLabel()`, `getDesktopCapabilities()` |
| `src/surface/capacitorBridge.ts` | Stub for future Capacitor iOS/Android plugins |
| `src/surface/index.ts` | Barrel re-export |

### Runtime Module (`src/runtime/`)
| File | Purpose |
|---|---|
| `src/runtime/client.ts` | Pure `RuntimeClient` interface (no factory, no implementation) |
| `src/runtime/types.ts` | Domain types: `RuntimeRun`, `RuntimeStep`, `StartRunRequest`, etc. |
| `src/runtime/workflowClient.ts` | Singleton factory: `getRuntimeClient()`, `resetRuntimeClient()` |
| `src/runtime/mock/mockClient.ts` | `MockRuntimeClient` — governed 5-step in-memory simulation |
| `src/runtime/mock/runLedger.ts` | `RunLedger` — in-memory audit store for runs, decisions, events |
| `src/runtime/index.ts` | Barrel re-export (public API) |

### Session Module (`src/session/`)
| File | Purpose |
|---|---|
| `src/session/types.ts` | Domain types: `SessionId`, `SurfaceKind`, `SurfaceRole`, `SessionEvent`, `RemoteControlCommand`, `PairingState` |
| `src/session/client.ts` | Pure `SessionClient` interface, `BridgeHealth` type |
| `src/session/sessionStore.ts` | In-memory store: sessions, surfaces, events, pairing lifecycle |
| `src/session/mockSessionBridge.ts` | `MockSessionBridge` impl: in-process command dispatch via shared `RuntimeClient` |
| `src/session/index.ts` | Barrel re-export (public API) |

### UI Components (`src/components/session/`)
| File | Purpose |
|---|---|
| `src/components/session/DesktopHostPanel.tsx` | Host mode UI: session ID, pairing code, connected surfaces |
| `src/components/session/MobileRemotePanel.tsx` | Controller mode UI: pairing input, remote action buttons |
| `src/components/session/SessionEventLog.tsx` | Event audit log: timestamped event stream |
| `src/components/session/ConnectedSurfacesPanel.tsx` | Surface list: kind, role, connection status, last seen |

### Backward-Compat Shims (do not use in new code)
| File | Shims to |
|---|---|
| `src/platform/platform.ts` | `src/surface/detector.ts` |
| `src/platform/desktopBridge.ts` | `src/surface/tauriBridge.ts` |
| `src/runtime/mockRuntimeClient.ts` | `src/runtime/mock/mockClient.ts` |
| `src/runtime/runLedger.ts` | `src/runtime/mock/runLedger.ts` |

---

## Recommended Next Implementation Steps

1. **Install Rust** → run `npm run tauri:build` → verify `.app` bundle
2. **Implement `LocalRuntimeClient`** (see `src/runtime/localRuntimeClient.placeholder.ts` Option A)
3. **Add local HTTP server to Tauri** (`src-tauri/src/main.rs`) — bind to `127.0.0.1` only
4. **Wire GovernanceEvaluator** into LocalRuntimeClient server before connector/runner dispatch
5. **Add Capacitor** (`npm install @capacitor/core @capacitor/cli && npx cap init`) — Phase C prerequisite
6. **Test LAN pairing** with a mobile device and the Mac Desktop App
