#!/usr/bin/env bash
set -euo pipefail

RUNS_FILE="${CREATORMESH_RUNS_FILE:-$HOME/creator-mesh-runtime/runs/runs.jsonl}"

if [[ ! -f "$RUNS_FILE" ]]; then
  echo "No runs file found: $RUNS_FILE"
  echo "Dispatch a task first with scripts/dispatch/create_claude_task.sh"
  exit 0
fi

python3 - "$RUNS_FILE" <<'PY'
import json
import sys

path = sys.argv[1]

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
                "project_id": "-",
                "repo": "-",
                "issue_number": "-",
                "status": f"line {line_no}",
                "title": line[:80],
            })
            continue

        rows.append({
            "created_at": str(item.get("created_at", ""))[:19],
            "project_id": str(item.get("project_id", "")),
            "repo": str(item.get("repo", "")),
            "issue_number": str(item.get("issue_number", "")),
            "status": str(item.get("status", "")),
            "title": str(item.get("title", "")),
        })

if not rows:
    print(f"No run records found in: {path}")
    sys.exit(0)

headers = ["created_at", "project_id", "repo", "issue", "status", "title"]

def trunc(value, max_len):
    value = str(value)
    if len(value) <= max_len:
        return value
    return value[: max_len - 3] + "..."

table = []

for r in rows:
    table.append([
        trunc(r["created_at"], 19),
        trunc(r["project_id"], 18),
        trunc(r["repo"], 32),
        trunc(r["issue_number"], 8),
        trunc(r["status"], 16),
        trunc(r["title"], 60),
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
