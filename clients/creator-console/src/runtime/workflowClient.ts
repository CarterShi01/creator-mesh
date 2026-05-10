// WorkflowClient factory — returns the shared singleton RuntimeClient.
//
// Always import the interface from './client', not here.
// This file exists only to provide createWorkflowClient() for backward compatibility
// and getRuntimeClient() as the new preferred API.
//
// Singleton pattern: one RuntimeClient per app session = one shared RunLedger.

import type { RuntimeClient } from './client'
export type { RuntimeClient, WorkflowClient } from './client'

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: RuntimeClient | null = null
let _initPromise: Promise<RuntimeClient> | null = null

/**
 * Returns the shared RuntimeClient singleton.
 * First call initialises the mock client; subsequent calls return the same instance.
 *
 * Phase 4 (current): always MockRuntimeClient.
 * Phase B (future): detect Tauri IPC available → LocalRuntimeClient.
 * Phase C (future): detect remote config → RemoteRuntimeClient.
 *
 * Import path note: Step 4 will move MockRuntimeClient to ./mock/mockClient.
 * Until then it lives at ./mockRuntimeClient.
 */
export async function getRuntimeClient(): Promise<RuntimeClient> {
  if (_instance) return _instance
  if (_initPromise) return _initPromise

  _initPromise = (async (): Promise<RuntimeClient> => {
    const { MockRuntimeClient } = await import('./mock/mockClient')
    _instance = new MockRuntimeClient()
    return _instance
  })()

  return _initPromise
}

/** Backward-compatible alias. Prefer getRuntimeClient() in new code. */
export async function createWorkflowClient(): Promise<RuntimeClient> {
  return getRuntimeClient()
}

/** Synchronous access — returns null before getRuntimeClient() has resolved. */
export function getRuntimeClientSync(): RuntimeClient | null {
  return _instance
}

/** Reset singleton (for testing). */
export function resetRuntimeClient(): void {
  _instance = null
  _initPromise = null
}
