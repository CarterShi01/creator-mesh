#!/usr/bin/env bash
set -euo pipefail

PLANS_INDEX_FILE="${CREATORMESH_PLANS_INDEX_FILE:-$HOME/creator-mesh-runtime/plans/index.jsonl}"
PROJECTS_FILE="${CREATORMESH_PROJECTS_FILE:-$HOME/creator-mesh-runtime/config/projects.yaml}"

IDEA_ID=""
PRIMARY_PROJECT_ID=""
YES_ALL=false

usage() {
  cat <<USAGE
Usage:
  $0 --idea-id <slug> --project <project_id> [--yes]

Arguments:
  --idea-id   The idea slug matching a merged plan under docs/plans/<slug>/
  --project   The primary managed project to dispatch child tasks to
  --yes       Dispatch all tasks without interactive prompts

Examples:
  $0 --idea-id 2026-05-18-idea-ranking --project idea-factory
  $0 --idea-id 2026-05-18-idea-ranking --project idea-factory --yes

Prerequisites:
  - docs/plans/<idea-id>/tasks.jsonl must exist locally (run git pull after merging the plan PR)
  - scripts/dispatch/create_claude_task.sh must be available
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --idea-id)   IDEA_ID="${2:-}";              shift 2 ;;
    --project)   PRIMARY_PROJECT_ID="${2:-}";   shift 2 ;;
    --yes|-y)    YES_ALL=true;                  shift ;;
    -h|--help)   usage; exit 0 ;;
    *)           echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$IDEA_ID" ]]; then
  echo "Missing --idea-id" >&2; exit 1
fi

if [[ -z "$PRIMARY_PROJECT_ID" ]]; then
  echo "Missing --project" >&2; exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TASKS_FILE="$REPO_ROOT/docs/plans/${IDEA_ID}/tasks.jsonl"
PLAN_FILE="$REPO_ROOT/docs/plans/${IDEA_ID}/plan.md"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "tasks.jsonl not found: $TASKS_FILE" >&2
  echo "Did you merge the plan PR and run git pull?" >&2
  exit 1
fi

PLAN_ARTIFACT_REF="docs/plans/${IDEA_ID}/"
CONTROL_PLANE_REPO="CarterShi01/creator-mesh"

# Look up target repo from projects registry
TARGET_REPO="$(
python3 - "$PROJECTS_FILE" "$PRIMARY_PROJECT_ID" <<'PY'
import sys, re
path, target = sys.argv[1], sys.argv[2]
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

if [[ -z "$TARGET_REPO" ]]; then
  echo "Cannot find repo for project: $PRIMARY_PROJECT_ID" >&2; exit 1
fi

# Check if tracker issue already exists in plan.md (idempotency)
TRACKER_ISSUE_URL=""
if [[ -f "$PLAN_FILE" ]]; then
  TRACKER_ISSUE_URL="$(
    grep -A1 '## Tracker issue' "$PLAN_FILE" 2>/dev/null \
    | tail -1 \
    | grep -E 'https?://' \
    | tr -d '[:space:]' \
    || true
  )"
fi

# Count tasks (needed for tracker body)
TASK_COUNT="$(python3 -c "
import sys
count = 0
with open('$TASKS_FILE', 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            count += 1
print(count)
")"

echo "CreatorMesh Plan Dispatcher"
echo "==========================="
echo "Idea ID:          ${IDEA_ID}"
echo "Primary project:  ${PRIMARY_PROJECT_ID}"
echo "Target repo:      ${TARGET_REPO}"
echo "Tasks file:       ${TASKS_FILE}"
echo ""
echo "Found ${TASK_COUNT} task(s) to dispatch."
echo ""

# Create tracker issue in target project (first touch of the target project,
# only after the plan has been reviewed and merged by the human operator)
if [[ -z "$TRACKER_ISSUE_URL" ]]; then
  IDEA_TITLE="$(grep '^# Plan:' "$PLAN_FILE" 2>/dev/null | sed 's/^# Plan: //' | head -1)"
  [[ -z "$IDEA_TITLE" ]] && IDEA_TITLE="$IDEA_ID"

  TASK_CHECKLIST="$(python3 - "$TASKS_FILE" <<'PY'
import json, sys
lines = []
with open(sys.argv[1], "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        lines.append(f"- [ ] {d['task_id']} — {d['title']}")
print("\n".join(lines))
PY
)"

  TRACKER_BODY="$(cat <<BODY
# CreatorMesh Plan Tracker — ${IDEA_TITLE}

**Idea ID:** ${IDEA_ID}
**Primary project:** ${PRIMARY_PROJECT_ID}
**Plan artifact:** https://github.com/${CONTROL_PLANE_REPO}/tree/master/${PLAN_ARTIFACT_REF}
**Status:** plan_ready

## Tasks
${TASK_CHECKLIST}

## Notes
Each task is dispatched as a separate GitHub issue by \`dispatch_plan.sh\`.
Child task issues link back to this tracker and to the plan artifact.
BODY
)"

  echo "Creating tracker issue in ${TARGET_REPO}..."
  TRACKER_ISSUE_URL="$(gh issue create \
    --repo "$TARGET_REPO" \
    --title "Plan Tracker: ${IDEA_TITLE}" \
    --body "$TRACKER_BODY")"
  echo "Tracker issue: ${TRACKER_ISSUE_URL}"
  echo ""

  # Update plans index with tracker URL
  if [[ -f "$PLANS_INDEX_FILE" ]]; then
    python3 - "$PLANS_INDEX_FILE" "$IDEA_ID" "$TRACKER_ISSUE_URL" <<'PY'
import json, sys
from datetime import datetime, timezone
plans_file, idea_id, tracker_url = sys.argv[1:]
records = []
with open(plans_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: records.append(json.loads(line))
            except: pass
for rec in records:
    if rec.get("idea_id") == idea_id:
        rec["tracker_issue_url"] = tracker_url
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
with open(plans_file, "w", encoding="utf-8") as f:
    for rec in records:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
PY
  fi
else
  echo "Tracker issue:    ${TRACKER_ISSUE_URL} (already exists)"
  echo ""
fi

# Dispatch tasks
DISPATCHED=0
SKIPPED=0

while IFS= read -r line; do
  [[ -z "${line// }" ]] && continue

  TASK_ID="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('task_id','?'))" "$line")"
  TASK_TITLE="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('title',''))" "$line")"
  TASK_PROJECT="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('project_id',''))" "$line")"
  TASK_BODY_RAW="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('body',''))" "$line")"
  DEPENDS_ON="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); deps=d.get('depends_on',[]); print(', '.join(deps) if deps else 'none')" "$line")"

  # Override project_id if provided on CLI, otherwise use the one in tasks.jsonl
  EFFECTIVE_PROJECT="${TASK_PROJECT:-$PRIMARY_PROJECT_ID}"
  if [[ -n "$PRIMARY_PROJECT_ID" ]]; then
    EFFECTIVE_PROJECT="$PRIMARY_PROJECT_ID"
  fi

  # Append back-links to the task body
  BACK_LINKS=""
  if [[ -n "$TRACKER_ISSUE_URL" ]]; then
    BACK_LINKS="
---

**CreatorMesh Plan:** ${PLAN_ARTIFACT_REF} (https://github.com/${CONTROL_PLANE_REPO}/tree/master/${PLAN_ARTIFACT_REF})
**Tracker issue:** ${TRACKER_ISSUE_URL}
**Task ID:** ${TASK_ID}
**Depends on:** ${DEPENDS_ON}"
  else
    BACK_LINKS="
---

**CreatorMesh Plan:** ${PLAN_ARTIFACT_REF} (https://github.com/${CONTROL_PLANE_REPO}/tree/master/${PLAN_ARTIFACT_REF})
**Task ID:** ${TASK_ID}
**Depends on:** ${DEPENDS_ON}"
  fi

  FULL_BODY="${TASK_BODY_RAW}${BACK_LINKS}"

  echo "─────────────────────────────────────────────"
  echo "Task:     ${TASK_ID} — ${TASK_TITLE}"
  echo "Project:  ${EFFECTIVE_PROJECT}"
  echo "Depends:  ${DEPENDS_ON}"
  echo ""
  echo "Body preview:"
  echo "$FULL_BODY" | head -12
  if [[ "$(echo "$FULL_BODY" | wc -l)" -gt 12 ]]; then
    echo "  ... (truncated)"
  fi
  echo ""

  if [[ "$YES_ALL" == true ]]; then
    ANSWER="y"
  elif [[ -e /dev/tty ]]; then
    read -r -p "Dispatch this task? [y/N] " ANSWER </dev/tty
  else
    read -r -p "Dispatch this task? [y/N] " ANSWER
  fi
  echo ""

  if [[ "$ANSWER" =~ ^[Yy]$ ]]; then
    "$SCRIPT_DIR/create_claude_task.sh" \
      --project "$EFFECTIVE_PROJECT" \
      --title "$TASK_TITLE" \
      --body "$FULL_BODY"
    DISPATCHED=$((DISPATCHED + 1))
    echo ""
  else
    echo "  Skipped ${TASK_ID}."
    SKIPPED=$((SKIPPED + 1))
  fi

done < "$TASKS_FILE"

echo "─────────────────────────────────────────────"
echo "Dispatch complete."
echo "  Dispatched: ${DISPATCHED}"
echo "  Skipped:    ${SKIPPED}"
echo ""

# Update plans index status
if [[ -f "$PLANS_INDEX_FILE" && "$DISPATCHED" -gt 0 ]]; then
  python3 - "$PLANS_INDEX_FILE" "$IDEA_ID" "$DISPATCHED" "$SKIPPED" "$TASK_COUNT" <<'PY'
import json, sys
from datetime import datetime, timezone

plans_file, idea_id, dispatched, skipped, total = sys.argv[1:]
dispatched = int(dispatched)
skipped = int(skipped)
total = int(total)

records = []
with open(plans_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue

new_status = "dispatched" if dispatched == total else "dispatching"
updated = False

for rec in records:
    if rec.get("idea_id") == idea_id:
        rec["status"] = new_status
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        updated = True

if updated:
    with open(plans_file, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Plans index updated: {idea_id} → {new_status}")
PY
fi

if [[ "$DISPATCHED" -gt 0 ]]; then
  echo "Track child runs with:"
  echo "  scripts/dispatch/list_runs.sh"
  echo "  scripts/dispatch/check_run_status.sh --latest"
fi
