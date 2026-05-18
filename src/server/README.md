# Server

HTTP server for CreatorMesh backend, built with [Hono](https://hono.dev/) running on Node.js.

Exposes the Runtime Loop and project registry to frontend clients (`clients/creator-app`).

## Endpoints

- `POST /api/turns` — submit a user turn to the Runtime Loop; returns `RuntimeTurnResult`
- `GET /api/projects` — list managed projects from the registry

## Running

```bash
GITHUB_TOKEN=... ANTHROPIC_API_KEY=... npm run server
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | — | LLM API key |
| `GITHUB_TOKEN` | ✅ | — | GitHub PAT for task dispatch |
| `PORT` | | `3001` | HTTP port |
| `CREATORMESH_API_TOKEN` | | — | Bearer token for API auth (optional) |
