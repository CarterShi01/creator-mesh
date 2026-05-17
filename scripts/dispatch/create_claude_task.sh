#!/usr/bin/env bash
set -euo pipefail

PROJECTS_FILE="${CREATORMESH_PROJECTS_FILE:-$HOME/creator-mesh-runtime/config/projects.yaml}"
RUNS_FILE="${CREATORMESH_RUNS_FILE:-$HOME/creator-mesh-runtime/runs/runs.jsonl}"

PROJECT_ID=""
TITLE=""
BODY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --title)
      TITLE="${2:-}"
      shift 2
      ;;
    --body)
      BODY="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "Missing --project" >&2
  exit 1
fi

if [[ -z "$TITLE" ]]; then
  echo "Missing --title" >&2
  exit 1
fi

if [[ -z "$BODY" ]]; then
  echo "Missing --body" >&2
  exit 1
fi

if [[ ! -f "$PROJECTS_FILE" ]]; then
  echo "Project registry not found: $PROJECTS_FILE" >&2
  exit 1
fi

REPO="$(
python3 - "$PROJECTS_FILE" "$PROJECT_ID" <<'PY'
import sys
import re

path = sys.argv[1]
target = sys.argv[2]

current_id = None

with open(path, "r", encoding="utf-8") as f:
    for raw in f:
        line = raw.strip()

        m = re.match(r"-\s+id:\s*(.+)", line)
        if m:
            current_id = m.group(1).strip().strip('"').strip("'")
            continue

        if current_id == target:
            m = re.match(r"repo:\s*(.+)", line)
            if m:
                print(m.group(1).strip().strip('"').strip("'"))
                sys.exit(0)

sys.exit(1)
PY
)"

if [[ -z "$REPO" ]]; then
  echo "Cannot find repo for project: $PROJECT_ID" >&2
  exit 1
fi

ISSUE_BODY_FILE="$(mktemp)"

cat > "$ISSUE_BODY_FILE" <<TASK
# CreatorMesh Task

## Project

$PROJECT_ID

## Target Repository

$REPO

## Task

$BODY

## Execution Policy

- Executor: Claude Code GitHub Action
- Keep the change small and focused.
- Do not merge automatically.
- Create or update a pull request for human review.
TASK

echo "Creating issue in $REPO..."

ISSUE_URL="$(gh issue create \
  --repo "$REPO" \
  --title "$TITLE" \
  --body-file "$ISSUE_BODY_FILE")"

rm -f "$ISSUE_BODY_FILE"

ISSUE_NUMBER="${ISSUE_URL##*/}"

echo "Created issue: $ISSUE_URL"

echo "Commenting @claude..."

gh issue comment "$ISSUE_NUMBER" \
  --repo "$REPO" \
  --body "@claude Please implement the task described in this issue. Keep the change small and focused. Do not merge automatically; create or update a pull request for human review."

mkdir -p "$(dirname "$RUNS_FILE")"

python3 - "$RUNS_FILE" "$PROJECT_ID" "$REPO" "$ISSUE_NUMBER" "$ISSUE_URL" "$TITLE" <<'PY'
import json
import sys
from datetime import datetime, timezone

runs_file, project_id, repo, issue_number, issue_url, title = sys.argv[1:]

record = {
    "created_at": datetime.now(timezone.utc).isoformat(),
    "project_id": project_id,
    "repo": repo,
    "executor": "claude-code",
    "issue_number": issue_number,
    "issue_url": issue_url,
    "title": title,
    "status": "dispatched"
}

with open(runs_file, "a", encoding="utf-8") as f:
    f.write(json.dumps(record, ensure_ascii=False) + "\n")
PY

echo
echo "Dispatch completed."
echo "Project: $PROJECT_ID"
echo "Repo: $REPO"
echo "Issue: $ISSUE_URL"
echo "Run record: $RUNS_FILE"
