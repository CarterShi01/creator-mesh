# Interface: src/connectors/notion

## Purpose

`src/connectors/notion` provides the Notion connector adapter for CreatorMesh. `NotionConnectorAdapter` implements `ConnectorPort` using the official Notion SDK. It is the first reference connector and validates the `ConnectorPort` abstraction before any other connector is built.

Callers in `src/orchestrator`, `src/workflows`, and `src/outputs` interact only with `ConnectorPort` — they do not import `NotionConnectorAdapter` directly.

## Public Exports

### `NotionConnectorAdapter`

Implements `ConnectorPort`. Initialized with `NotionConnectorConfig`.

```
NotionConnectorAdapter implements ConnectorPort {
  connectorId: "notion"
  capabilities(): NotionCapabilityRegistry
  execute(action: ConnectorAction): Promise<ConnectorResult>
}
```

### `NotionConnectorConfig`

```
NotionConnectorConfig extends ConnectorConfig {
  connectorId: "notion"
  apiKey: string          // NOTION_API_KEY — injected at init, never logged
  notionVersion?: string  // defaults to "2022-06-28"
}
```

### `NotionCapabilityRegistry`

Pre-declared MVP capability set. Returned by `capabilities()`.

| Capability ID | Type | Resource type | Permission | Approval | Reversible |
|---|---|---|---|---|---|
| `notion.search.page` | `search` | `page` | `safe-read` | `never` | `true` |
| `notion.read.page` | `read` | `page` | `safe-read` | `never` | `true` |
| `notion.read.block` | `read` | `block` | `safe-read` | `never` | `true` |
| `notion.create.page` | `create` | `page` | `write` | `conditional` | `false` |
| `notion.append.block` | `append` | `block` | `write` | `conditional` | `false` |

### Notion Resource Types

| Resource type | Meaning |
|---|---|
| `"page"` | A Notion page (document) |
| `"block"` | A Notion block (content unit within a page) |
| `"database"` | A Notion database (deferred — not in MVP scope) |

### Normalized Data Shapes

`ConnectorResult.data` carries one of these shapes depending on the capability:

**`NotionPageData`** — returned by `read/page` and individual results within `search/page`:
```
{
  id: string
  title: string
  url: string
  lastEditedTime: string    // ISO 8601
  createdTime: string
  archived: boolean
}
```

**`NotionBlockData[]`** — returned by `read/block` and `append/block`:
```
{
  id: string
  type: string              // "paragraph", "heading_1", "bulleted_list_item", etc.
  plainText: string         // rich text stripped to plain text
  hasChildren: boolean
}[]
```

**`NotionSearchData`** — returned by `search/page`:
```
{
  results: NotionPageData[]
  hasMore: boolean
  nextCursor?: string
}
```

**`NotionCreateData`** — returned by `create/page`:
```
{
  id: string
  url: string
  title: string
}
```

### Error Codes

`ConnectorResult.error` carries one of these string codes on failure:

| Code | Meaning |
|---|---|
| `"notion.auth.invalid"` | API key is invalid or expired |
| `"notion.permission.denied"` | Integration does not have access to this resource |
| `"notion.resource.not_found"` | Page, block, or database does not exist |
| `"notion.conflict"` | Concurrent edit conflict |
| `"notion.rate_limited"` | Notion API rate limit reached |
| `"notion.provider.error"` | Notion server error (5xx) |
| `"notion.capability.unsupported"` | Requested capability not in MVP registry |

## Inputs

`ConnectorAction` from `src/orchestrator` or `src/workflows`, with:
- `connectorId: "notion"`
- `capability` matching one of the five MVP capabilities
- `resourceId` (for `read` and `append`) — the Notion page or block UUID
- Structured payload for `search` (query string) and `create` (parent, title, initial content) — payload structure is an open design question; see DESIGN.md

## Outputs

`ConnectorResult` returned to caller:
- `status: "success" | "failure" | "partial"`
- `data` matching one of the normalized shapes above
- `error` as a structured error code string on failure
- `auditId` referencing the `AuditRecord` persisted by `src/governance`

## Allowed Dependencies

- `src/core`
- `src/shared`
- `@notionhq/client` (Notion official SDK — the only external library dependency)

## Disallowed Dependencies

- Any other `src/` module
- Any Notion unofficial API
- Direct `fetch` or `axios` calls to Notion (use the SDK)

## Invariants

- **`connectorId` is always `"notion"`** — hardcoded in the adapter, not configurable.
- **`apiKey` is never logged or included in `ConnectorAction` / `ConnectorResult`** — only `NotionConnectorConfig` holds it, and only at init time.
- **Unsupported capability types return `ConnectorResult.status: "failure"`** — never throw.
- **All Notion API errors are mapped to structured error codes** — no raw HTTP errors or SDK exceptions propagate to callers.
- **`capabilities()` always returns the same registry** — the MVP capability set is static; it does not change between calls.
- **Rich text is normalized to `plainText`** — no Notion rich text objects appear in `ConnectorResult.data`.

## Deferred (Not in MVP)

- `update/page`, `update/block` — not in capability registry
- `delete/page` (archive) — not in capability registry
- `sync` — not in capability registry
- `subscribe` — not in capability registry
- Database query — not in capability registry
- OAuth authentication — deferred to multi-user phase
- Rich text structure preservation — deferred

## Main Files

No implementation files yet.

Planned:
- `index.ts` — exports `NotionConnectorAdapter` and `NotionConnectorConfig`
- `adapter.ts` — `NotionConnectorAdapter` implementation
- `capabilities.ts` — `NotionCapabilityRegistry` constant declaration
- `normalize.ts` — Notion API response → internal data shape normalization
- `errors.ts` — HTTP status → error code mapping

## Change Rules for Agents

1. Read `AGENTS.md`.
2. Read `docs/context-map.md`.
3. Read `src/connectors/DESIGN.md` and `src/connectors/INTERFACE.md` — the parent ConnectorPort contract.
4. Read this `INTERFACE.md`.
5. Read `DESIGN.md` in this directory.
6. Identify whether the change affects the public contract, capability registry, normalized shapes, or error codes.
7. Update this file if the public contract changes.
8. Apply bottom-up propagation: check whether `src/connectors/DESIGN.md` or `src/connectors/INTERFACE.md` needs a corresponding update.
