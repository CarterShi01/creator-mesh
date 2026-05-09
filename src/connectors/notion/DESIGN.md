# Design: src/connectors/notion

## Current Design Summary

`NotionConnectorAdapter` is a Direct API adapter that implements `ConnectorPort` using the official Notion SDK (`@notionhq/client`). It is the first reference connector for CreatorMesh.

Its purpose is to validate the `ConnectorPort` abstraction — not to wrap the full Notion API. Only the capabilities needed by CreatorMesh's MVP product workflows are implemented.

No implementation files exist yet.

## Design Goals

- Implement `ConnectorPort` faithfully: all callers depend on the port, not on this adapter.
- Cover only the MVP capability set: search, read (page + block), create (page), append (block).
- Normalize Notion-specific response shapes into a consistent internal model.
- Keep the adapter thin: SDK call → normalize result → return `ConnectorResult`. No business logic.
- Make auth, pagination, and error handling predictable and testable.

## What NotionConnectorAdapter Is

`NotionConnectorAdapter` is a thin wrapper over the Notion SDK.

It receives a `ConnectorAction`, inspects `capability.type` and `resourceType` to determine which Notion API endpoint to call, executes the call, normalizes the response into `ConnectorResult.data`, and returns.

It does not decide what to do — that is the orchestrator's job. It does not call governance or storage. It does not hold state between calls.

## NotionConnectorConfig

Authentication uses an internal integration token (API key), passed via environment variable. No OAuth at v1.

```
NotionConnectorConfig {
  connectorId: "notion"
  apiKey: string          // from NOTION_API_KEY environment variable
  notionVersion?: string  // defaults to current stable version (e.g. "2022-06-28")
}
```

Raw credentials must never appear in `ConnectorAction`, `ConnectorResult`, or logs. `ConnectorConfig` is injected once at adapter initialization.

## MVP Capability Registry

The Notion adapter declares five capabilities at initialization time.

| Capability ID | Type | Resource type | Permission | Approval |
|---|---|---|---|---|
| `notion.search.page` | `search` | `page` | `safe-read` | `never` |
| `notion.read.page` | `read` | `page` | `safe-read` | `never` |
| `notion.read.block` | `read` | `block` | `safe-read` | `never` |
| `notion.create.page` | `create` | `page` | `write` | `conditional` |
| `notion.append.block` | `append` | `block` | `write` | `conditional` |

All five are reversible in practice (a created page can be archived; appended blocks can be deleted), but `reversible: true` applies only to `search` and `read` strictly. `create` and `append` are marked `reversible: false` because CreatorMesh does not implement undo at v1.

## Capability → Notion SDK Dispatch Table

The adapter dispatches based on `(capability.type, resourceType)`:

| type | resourceType | Notion SDK call | Notion API endpoint |
|------|-------------|-----------------|---------------------|
| `search` | `page` | `notion.search({ filter: { property: "object", value: "page" }, query })` | `POST /v1/search` |
| `read` | `page` | `notion.pages.retrieve({ page_id })` | `GET /v1/pages/{page_id}` |
| `read` | `block` | `notion.blocks.children.list({ block_id })` | `GET /v1/blocks/{block_id}/children` |
| `create` | `page` | `notion.pages.create({ parent, properties, children })` | `POST /v1/pages` |
| `append` | `block` | `notion.blocks.children.append({ block_id, children })` | `PATCH /v1/blocks/{block_id}/children` |

Any `(type, resourceType)` combination not in this table returns a `ConnectorResult` with `status: "failure"` and a descriptive error — it is not a thrown exception.

## Normalized Result Shapes

`ConnectorResult.data` carries normalized internal shapes, not raw Notion API objects. This protects higher layers from Notion API changes.

**Page (from `read` or `search`):**
```
NotionPageData {
  id: string
  title: string           // extracted from title property
  url: string
  lastEditedTime: string  // ISO 8601
  createdTime: string
  archived: boolean
}
```

**Block list (from `read/block` or `append/block`):**
```
NotionBlockData {
  id: string
  type: string            // "paragraph", "heading_1", "bulleted_list_item", etc.
  plainText: string       // extracted plain text content, stripped of rich text structure
  hasChildren: boolean
}[]
```

**Search results (from `search/page`):**
```
NotionSearchData {
  results: NotionPageData[]
  hasMore: boolean
  nextCursor?: string
}
```

**Create result (from `create/page`):**
```
NotionCreateData {
  id: string
  url: string
  title: string
}
```

Rich text formatting (bold, italic, links, mentions) is stripped to plain text for MVP. Structured rich text is a future evolution item.

## Pagination Strategy

Notion uses cursor-based pagination (`start_cursor`, `has_more`) for `search` and block reads.

**MVP decision: adapter handles pagination internally for `read/block`.**

When reading block children, the adapter fetches all pages automatically and returns the complete list in `ConnectorResult.data`. This simplifies callers at the cost of potentially large responses for deeply nested pages.

For `search`, the first page of results is returned with `hasMore` and `nextCursor` exposed in `NotionSearchData`. Callers may issue a follow-up `ConnectorAction` with `cursor` in the payload to fetch the next page. Full auto-pagination for search is deferred.

**Rationale:** Block read callers (knowledge layer, workflows) should not need to manage cursor state. Search callers (orchestrator routing) may want to page results interactively.

## Error Taxonomy

The adapter maps Notion API HTTP errors to structured `ConnectorResult` outcomes. No raw HTTP errors propagate to callers.

| HTTP status | Notion error | ConnectorResult.error |
|---|---|---|
| 401 | `unauthorized` | `"notion.auth.invalid"` |
| 403 | `restricted_resource` | `"notion.permission.denied"` |
| 404 | `object_not_found` | `"notion.resource.not_found"` |
| 409 | `conflict_error` | `"notion.conflict"` |
| 429 | `rate_limited` | `"notion.rate_limited"` |
| 500+ | provider error | `"notion.provider.error"` |

All errors result in `ConnectorResult.status: "failure"`. The adapter does not retry automatically at v1 — retry policy is the orchestrator's responsibility.

## Deferred Scope (and Why)

| Capability | Deferred reason |
|---|---|
| `update` (page/block) | Requires conflict detection — what if Notion content changed since last read? |
| `delete` (archive page) | Destructive; requires explicit approval workflow to be fully designed first |
| `sync` (bidirectional) | Requires conflict resolution strategy; no clear winner between internal and Notion state |
| `subscribe` (webhooks) | Requires a public endpoint, webhook secret management, and event routing — deferred to post-MVP |
| Full rich text preservation | Notion's rich text model is complex; plain text extraction is sufficient for MVP workflows |
| Database query | Database-specific query API is richer and separate from page search; deferred |
| OAuth | Multi-user auth deferred; single integration token is sufficient for personal use |

## Key Decisions

- **Thin adapter only**: no business logic in the adapter. If the caller sends a `create` action, the adapter creates — it does not decide whether creation is appropriate.
- **Normalize immediately**: Notion API response shapes are never exposed beyond the adapter boundary. This shields orchestrator, knowledge, and workflow layers from Notion SDK changes.
- **Plain text at MVP**: rich text structure is flattened to `plainText`. Structured rich text support is a future evolution.
- **Internal pagination for blocks**: simplifies callers; may be revisited if response size becomes a problem.
- **Error as result, not exception**: Notion API errors always return `ConnectorResult.status: "failure"`, never throw. Callers handle all outcomes uniformly.

## Tradeoffs

- **Internal block pagination** means a page with hundreds of blocks will make multiple SDK calls before returning. For MVP this is acceptable; for production it needs a streaming or lazy model.
- **Normalizing away Notion's rich text** loses formatting information that might be useful for preserving Notion note structure. For a knowledge tool, this is a meaningful tradeoff — accepted for MVP, revisited later.
- **No retry logic in adapter** keeps the adapter simple but means transient rate limit errors bubble up to the orchestrator. The orchestrator will need a retry/backoff strategy when it delegates runner and connector calls.

## Alternatives Considered

- **Expose raw Notion API objects in ConnectorResult.data** — rejected. Would couple knowledge and workflow layers to Notion SDK types. Any Notion API change would require updates across multiple modules.
- **Handle retries inside the adapter** — rejected for v1. Retry policy belongs in the orchestrator, which has visibility into the full workflow context (budget, urgency, approval state).
- **Use Notion's unofficial API** — rejected. Official SDK is stable, versioned, and supported.

## Current Assumptions

- The Notion integration token (API key) is a personal integration token created by the creator in Notion's developer settings — not a public OAuth app.
- The Notion SDK version is pinned at initialization and does not auto-update.
- The first `ConnectorAction` will be a `search/page` or `read/page` — read-only, safe-read level, no approval required.
- Block depth is assumed shallow for MVP (one level of children per read call).

## Open Questions

- **Nested block trees**: Notion pages can have deeply nested blocks (blocks with child blocks). Should the adapter recursively fetch children, or return only the top level with `hasChildren: true` as a signal to the caller?
- **Database scope**: Notion databases contain structured data. Should `search` cover databases, or only pages? If databases are in scope, what does `NotionPageData` look like for a database row?
- **Plain text extraction for titles**: Notion page titles are rich text arrays. The adapter should extract plain text, but what if the title is empty or contains only unsupported block types?
- **Rate limit backoff**: should the adapter include a configurable `retryOnRateLimit` flag, or always fail immediately and leave retry to orchestrator?
- **ConnectorAction payload structure**: `ConnectorAction.payloadSummary` is a string, but the adapter needs structured input (e.g., `query` for search, `page_id` for read, `parent` + `title` for create). Where does the structured input live — in a typed `payload` field added to `ConnectorAction`, or parsed from `payloadSummary`?

## Future Evolution

- Add `update` capability once conflict detection is designed.
- Add `delete` (archive) capability once the approval workflow for destructive actions is validated.
- Add OAuth flow for multi-user or public deployments.
- Add structured rich text preservation when knowledge workflows require formatting.
- Add database query capability when project/task management workflows need structured data.
- Add webhook subscription when real-time triggers are needed.

## ChatGPT Handoff Context

`src/connectors/notion/` has no implementation yet. `NotionConnectorAdapter` implements `ConnectorPort` using the official Notion SDK. MVP capabilities: `search/page`, `read/page`, `read/block`, `create/page`, `append/block`. Auth: API key via `NOTION_API_KEY` env var, no OAuth. Normalization: Notion responses → internal `NotionPageData` / `NotionBlockData` shapes; rich text stripped to plain text. Pagination: internal for block reads, cursor-exposed for search. Errors: mapped to structured error codes, never thrown. Key open question: how structured input (query, page_id, parent) flows into `ConnectorAction` — `payloadSummary` is currently a string; a typed `payload` field may be needed.
