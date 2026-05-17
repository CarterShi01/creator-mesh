#!/usr/bin/env bash
set -euo pipefail

RUNS_FILE="${CREATORMESH_RUNS_FILE:-$HOME/creator-mesh-runtime/runs/runs.jsonl}"

IDEA_ID_FILTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --idea-id) IDEA_ID_FILTER="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--idea-id <slug>]"
      echo "  --idea-id   Filter runs to a specific plan (matches plan_id field)"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$RUNS_FILE" ]]; then
  echo "No runs file found: $RUNS_FILE"
  echo "Dispatch a task first with scripts/dispatch/create_claude_task.sh"
  exit 0
fi

python3 - "$RUNS_FILE" "$IDEA_ID_FILTER" <<'PY'
import json
import sys

path, idea_id_filter = sys.argv[1], sys.argv[2]

rows = []

with open(path, "r", encoding="utf-8") as f:
    for line_no, line in enumerate(f, start=1):
        line = line.strip()
        if not line:
            continue

        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            rows.append({
                "created_at": "INVALID_JSON",
                "kind": "-",
                "project_id": "-",
                "issue_number": "-",
                "task_id": "-",
                "status": f"line {line_no}",
                "title": line[:80],
            })
            continue

        if idea_id_filter and item.get("plan_id", "") != idea_id_filter:
            continue

        rows.append({
            "created_at":   str(item.get("created_at", ""))[:19],
            "kind":         str(item.get("kind", "")),
            "project_id":   str(item.get("project_id", "")),
            "issue_number": str(item.get("issue_number", "")),
            "task_id":      str(item.get("task_id", "")),
            "status":       str(item.get("status", "")),
            "title":        str(item.get("title", "")),
        })

if not rows:
    if idea_id_filter:
        print(f"No run records found for plan '{idea_id_filter}' in: {path}")
    else:
        print(f"No run records found in: {path}")
    sys.exit(0)

headers = ["created_at", "kind", "project_id", "issue", "task_id", "status", "title"]

def trunc(value, max_len):
    value = str(value)
    if len(value) <= max_len:
        return value
    return value[: max_len - 3] + "..."

table = []

for r in rows:
    table.append([
        trunc(r["created_at"],   19),
        trunc(r["kind"],          6),
        trunc(r["project_id"],   18),
        trunc(r["issue_number"],  8),
        trunc(r["task_id"],       6),
        trunc(r["status"],       26),
        trunc(r["title"],        52),
    ])

widths = []
for i, h in enumerate(headers):
    widths.append(max(len(h), *(len(row[i]) for row in table)))

def print_row(row):
    print(" | ".join(str(row[i]).ljust(widths[i]) for i in range(len(row))))

print_row(headers)
print("-+-".join("-" * w for w in widths))

for row in table:
    print_row(row)
PY
