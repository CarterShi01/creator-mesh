#!/usr/bin/env bash
set -euo pipefail

PROJECTS_FILE="${CREATORMESH_PROJECTS_FILE:-$HOME/creator-mesh-runtime/config/projects.yaml}"
RUNS_FILE="${CREATORMESH_RUNS_FILE:-$HOME/creator-mesh-runtime/runs/runs.jsonl}"
PLANS_INDEX_FILE="${CREATORMESH_PLANS_INDEX_FILE:-$HOME/creator-mesh-runtime/plans/index.jsonl}"

IDEA_ID=""
PRIMARY_PROJECT_ID=""
BRIEF_FILE=""
BRIEF_INLINE=""

usage() {
  cat <<USAGE
Usage:
  $0 --idea-id <slug> --project <project_id> --brief-file <path>
  $0 --idea-id <slug> --project <project_id> --brief "<inline text>"

Arguments:
  --idea-id   Unique slug for this idea, e.g. "2026-05-18-user-auth"
  --project   Primary managed project for the tracker issue, e.g. "idea-factory"
  --brief-file  Path to a markdown file containing the idea brief
  --brief     Inline idea brief text (use instead of --brief-file)

Examples:
  $0 --idea-id 2026-05-18-idea-ranking --project idea-factory --brief-file /tmp/brief.md
  $0 --idea-id 2026-05-18-idea-ranking --project idea-factory --brief "Add idea ranking to idea-factory."
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --idea-id)       IDEA_ID="${2:-}";           shift 2 ;;
    --project)       PRIMARY_PROJECT_ID="${2:-}"; shift 2 ;;
    --brief-file)    BRIEF_FILE="${2:-}";         shift 2 ;;
    --brief)         BRIEF_INLINE="${2:-}";       shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    *)               echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$IDEA_ID" ]]; then
  echo "Missing --idea-id" >&2; exit 1
fi

if [[ -z "$PRIMARY_PROJECT_ID" ]]; then
  echo "Missing --project" >&2; exit 1
fi

if [[ -z "$BRIEF_FILE" && -z "$BRIEF_INLINE" ]]; then
  echo "Missing --brief-file or --brief" >&2; exit 1
fi

IDEA_BRIEF=""
if [[ -n "$BRIEF_FILE" ]]; then
  if [[ ! -f "$BRIEF_FILE" ]]; then
    echo "Brief file not found: $BRIEF_FILE" >&2; exit 1
  fi
  IDEA_BRIEF="$(cat "$BRIEF_FILE")"
else
  IDEA_BRIEF="$BRIEF_INLINE"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/templates/planner-prompt.md"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Planner prompt template not found: $TEMPLATE_FILE" >&2; exit 1
fi

# Substitute {IDEA_ID} and {PRIMARY_PROJECT_ID} placeholders in template
PLANNER_INSTRUCTIONS="$(
  sed \
    -e "s/{IDEA_ID}/$IDEA_ID/g" \
    -e "s/{PRIMARY_PROJECT_ID}/$PRIMARY_PROJECT_ID/g" \
    "$TEMPLATE_FILE"
)"

TASK_BODY="$(cat <<BODY
## Planner Task

**Idea ID:** ${IDEA_ID}
**Primary project:** ${PRIMARY_PROJECT_ID}

## Idea Brief

${IDEA_BRIEF}

---

${PLANNER_INSTRUCTIONS}
BODY
)"

TASK_TITLE="[Plan] ${IDEA_ID}"

echo "Dispatching planning task..."
echo "  Idea ID:         ${IDEA_ID}"
echo "  Primary project: ${PRIMARY_PROJECT_ID}"
echo "  Dispatching to:  creator-mesh (control plane repo)"
echo ""

"$SCRIPT_DIR/create_claude_task.sh" \
  --project creator-mesh \
  --title "$TASK_TITLE" \
  --body "$TASK_BODY" \
  --kind plan \
  --plan-id "$IDEA_ID"

# Capture the issue URL from the most recent run record
ISSUE_URL=""
if [[ -f "$RUNS_FILE" ]]; then
  ISSUE_URL="$(python3 - "$RUNS_FILE" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    lines = [l.strip() for l in f if l.strip()]
if lines:
    try:
        print(json.loads(lines[-1]).get("issue_url", ""))
    except Exception:
        pass
PY
)"
fi

# Append to plans index
mkdir -p "$(dirname "$PLANS_INDEX_FILE")"

python3 - "$PLANS_INDEX_FILE" "$IDEA_ID" "$PRIMARY_PROJECT_ID" "$ISSUE_URL" <<'PY'
import json, sys
from datetime import datetime, timezone

plans_file, idea_id, primary_project_id, planning_issue_url = sys.argv[1:]

record = {
    "created_at": datetime.now(timezone.utc).isoformat(),
    "idea_id": idea_id,
    "primary_project_id": primary_project_id,
    "plan_artifact_path": f"docs/plans/{idea_id}/",
    "planning_issue_url": planning_issue_url,
    "tracker_issue_url": "",
    "status": "planning"
}

with open(plans_file, "a", encoding="utf-8") as f:
    f.write(json.dumps(record, ensure_ascii=False) + "\n")
PY

echo ""
echo "Plan dispatch completed."
echo "  Idea ID:          ${IDEA_ID}"
echo "  Planning issue:   ${ISSUE_URL}"
echo "  Plans index:      ${PLANS_INDEX_FILE}"
echo ""
echo "Next steps:"
echo "  1. Wait for Claude Code to open a PR adding docs/plans/${IDEA_ID}/"
echo "  2. Review and merge the plan PR"
echo "  3. git pull  (to get the plan artifact locally)"
echo "  4. scripts/dispatch/dispatch_plan.sh --idea-id ${IDEA_ID} --project ${PRIMARY_PROJECT_ID}"
