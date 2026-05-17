#!/usr/bin/env bash
set -euo pipefail

PLANS_INDEX_FILE="${CREATORMESH_PLANS_INDEX_FILE:-$HOME/creator-mesh-runtime/plans/index.jsonl}"

if [[ ! -f "$PLANS_INDEX_FILE" ]]; then
  echo "No plans index found: $PLANS_INDEX_FILE"
  echo "Create a plan first with scripts/dispatch/create_plan_task.sh"
  exit 0
fi

python3 - "$PLANS_INDEX_FILE" <<'PY'
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
                "idea_id": "-",
                "primary_project_id": "-",
                "status": f"line {line_no}",
                "tracker_issue_url": line[:60],
            })
            continue

        rows.append({
            "created_at": str(item.get("created_at", ""))[:19],
            "idea_id": str(item.get("idea_id", "")),
            "primary_project": str(item.get("primary_project_id", "")),
            "status": str(item.get("status", "")),
            "tracker": str(item.get("tracker_issue_url", "") or item.get("planning_issue_url", "")),
        })

if not rows:
    print(f"No plan records found in: {path}")
    sys.exit(0)

headers = ["created_at", "idea_id", "primary_project", "status", "tracker"]

def trunc(value, max_len):
    value = str(value)
    if len(value) <= max_len:
        return value
    return value[:max_len - 3] + "..."

table = []
for r in rows:
    table.append([
        trunc(r["created_at"], 19),
        trunc(r["idea_id"], 36),
        trunc(r["primary_project"], 18),
        trunc(r["status"], 14),
        trunc(r["tracker"], 60),
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
