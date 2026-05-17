#!/usr/bin/env bash
set -euo pipefail

RUNS_FILE="${CREATORMESH_RUNS_FILE:-$HOME/creator-mesh-runtime/runs/runs.jsonl}"
PLANS_INDEX_FILE="${CREATORMESH_PLANS_INDEX_FILE:-$HOME/creator-mesh-runtime/plans/index.jsonl}"
CONTROL_PLANE_REPO="CarterShi01/creator-mesh"

IDEA_ID=""
REFRESH_TRACKER=false
WRITE_BACK=false

usage() {
  cat <<USAGE
Usage:
  $0 --idea-id <slug> [--write-back] [--refresh-tracker]

Arguments:
  --idea-id          Plan slug, e.g. 2026-05-18-idea-ranking
  --write-back       Persist observed status back to runs.jsonl and plans index
  --refresh-tracker  Rewrite the GitHub tracker issue checklist with live status

Examples:
  $0 --idea-id 2026-05-18-idea-ranking
  $0 --idea-id 2026-05-18-idea-ranking --write-back --refresh-tracker

Prerequisites:
  - docs/plans/<idea-id>/tasks.jsonl must exist locally
  - GitHub CLI (gh) must be authenticated
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --idea-id)          IDEA_ID="${2:-}";     shift 2 ;;
    --write-back)       WRITE_BACK=true;      shift   ;;
    --refresh-tracker)  REFRESH_TRACKER=true; shift   ;;
    -h|--help)          usage; exit 0 ;;
    *)                  echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$IDEA_ID" ]]; then
  echo "Missing --idea-id" >&2; exit 1
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

# ---------------------------------------------------------------------------
# Load plan metadata from index
# ---------------------------------------------------------------------------
eval "$(python3 - "$PLANS_INDEX_FILE" "$IDEA_ID" <<'PY'
import json, sys

path, idea_id = sys.argv[1], sys.argv[2]
d = {}
try:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                rec = json.loads(line)
                if rec.get("idea_id") == idea_id:
                    d = rec
            except Exception:
                pass
except FileNotFoundError:
    pass

def q(v):
    return "'" + str(v).replace("'", "'\\''") + "'"

print(f"PRIMARY_PROJECT_ID={q(d.get('primary_project_id', ''))}")
print(f"TRACKER_ISSUE_URL={q(d.get('tracker_issue_url', ''))}")
print(f"PLAN_STATUS={q(d.get('status', ''))}")
PY
)"

# Fallback: read tracker URL from plan.md if index is empty/stale
if [[ -z "$TRACKER_ISSUE_URL" && -f "$PLAN_FILE" ]]; then
  TRACKER_ISSUE_URL="$(grep -A3 '## Tracker issue' "$PLAN_FILE" 2>/dev/null \
    | grep -E 'https?://' | head -1 | tr -d '[:space:]' || true)"
fi

PLAN_ARTIFACT_REF="docs/plans/${IDEA_ID}/"

# ---------------------------------------------------------------------------
# Build per-task lookup: task_id, title, project_id, issue_number, repo
# Prefer issue_number/issue_url already written back into tasks.jsonl;
# fall back to runs.jsonl join (by plan_id+task_id, then by project_id+title)
# ---------------------------------------------------------------------------
TASK_LOOKUP="$(python3 - "$TASKS_FILE" "$RUNS_FILE" "$IDEA_ID" <<'PY'
import json, sys, os

tasks_file, runs_file, idea_id = sys.argv[1], sys.argv[2], sys.argv[3]

tasks = []
with open(tasks_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: tasks.append(json.loads(line))
            except Exception: pass

runs_by_plan_task = {}
runs_by_title = {}
if os.path.isfile(runs_file):
    with open(runs_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                r = json.loads(line)
                pid = r.get("plan_id", "")
                tid = r.get("task_id", "")
                if pid == idea_id and tid:
                    runs_by_plan_task[tid] = r
                key = (r.get("project_id", ""), r.get("title", ""))
                if key not in runs_by_title:
                    runs_by_title[key] = r
            except Exception: pass

for t in tasks:
    task_id    = t.get("task_id", "")
    project_id = t.get("project_id", "")
    title      = t.get("title", "")

    issue_number = str(t.get("issue_number") or "")
    issue_url    = str(t.get("issue_url") or "")
    repo         = ""

    if not issue_number and task_id in runs_by_plan_task:
        r = runs_by_plan_task[task_id]
        issue_number = str(r.get("issue_number") or "")
        issue_url    = str(r.get("issue_url") or "")
        repo         = str(r.get("repo") or "")

    if not issue_number:
        r = runs_by_title.get((project_id, title), {})
        issue_number = str(r.get("issue_number") or "")
        issue_url    = str(r.get("issue_url") or "")
        repo         = str(r.get("repo") or "")

    fields = [task_id, title, project_id, issue_number, issue_url, repo]
    print("\t".join(f.replace("\t", " ") for f in fields))
PY
)"

# ---------------------------------------------------------------------------
# Per-task status query — call check_run_status.sh for each dispatched task
# Accumulate TSV results: task_id, title, issue_number, issue_url, overall, pr_num, pr_url
# ---------------------------------------------------------------------------
RESULTS_FILE="$(mktemp)"
trap 'rm -f "$RESULTS_FILE"' EXIT

while IFS=$'\t' read -r TASK_ID TASK_TITLE TASK_PROJECT ISSUE_NUMBER ISSUE_URL TASK_REPO; do
  if [[ -z "$ISSUE_NUMBER" ]]; then
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$TASK_ID" "$TASK_TITLE" "" "" "not_dispatched" "" "" \
      >> "$RESULTS_FILE"
    continue
  fi

  STATUS_OUTPUT="$("$SCRIPT_DIR/check_run_status.sh" \
    --repo "$TASK_REPO" --issue "$ISSUE_NUMBER" 2>/dev/null)" || STATUS_OUTPUT=""

  OVERALL="$(printf '%s\n' "$STATUS_OUTPUT" \
    | grep -xE 'merged|needs_human_review|pr_closed_without_merge|waiting_for_workflow|workflow_running|waiting_for_pr|workflow_failed' \
    | head -1 || true)"
  [[ -z "$OVERALL" ]] && OVERALL="unknown"

  PR_NUM="$(printf '%s\n' "$STATUS_OUTPUT" \
    | grep '^PR:' | head -1 | awk '{print $2}' || true)"

  PR_URL="$(printf '%s\n' "$STATUS_OUTPUT" \
    | grep '^URL:' | tail -1 | awk '{print $2}' || true)"

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$TASK_ID" "$TASK_TITLE" "$ISSUE_NUMBER" "$ISSUE_URL" \
    "$OVERALL" "${PR_NUM:-}" "${PR_URL:-}" \
    >> "$RESULTS_FILE"

done <<< "$TASK_LOOKUP"

# ---------------------------------------------------------------------------
# Render table + summary
# ---------------------------------------------------------------------------
python3 - "$RESULTS_FILE" "$IDEA_ID" \
  "$PRIMARY_PROJECT_ID" "$PLAN_ARTIFACT_REF" \
  "$TRACKER_ISSUE_URL" "$PLAN_STATUS" <<'PY'
import sys

(results_file, idea_id, primary_project_id,
 artifact_ref, tracker_url, plan_status) = sys.argv[1:]

rows = []
with open(results_file, "r") as f:
    for line in f:
        line = line.rstrip('\n')
        if not line: continue
        parts = line.split('\t')
        while len(parts) < 7: parts.append('')
        rows.append({
            "task_id":   parts[0],
            "title":     parts[1],
            "issue":     f"#{parts[2]}" if parts[2] else "-",
            "issue_url": parts[3],
            "overall":   parts[4],
            "pr":        parts[5] if parts[5] else "-",
            "pr_url":    parts[6],
        })

print(f"Plan: {idea_id}")
print(f"Primary project: {primary_project_id or '-'}")
print(f"Plan artifact:   {artifact_ref}")
print(f"Tracker:         {tracker_url or '(not set — run dispatch_plan.sh first)'}")
print(f"Status:          {plan_status or '-'}")
print()

COL_TASK  = 6
COL_TITLE = 46
COL_ISSUE = 7
COL_PR    = 6

header  = f"{'Task':<{COL_TASK}}  {'Title':<{COL_TITLE}}  {'Issue':<{COL_ISSUE}}  {'PR':<{COL_PR}}  Status"
divider = f"{'─'*COL_TASK}  {'─'*COL_TITLE}  {'─'*COL_ISSUE}  {'─'*COL_PR}  {'─'*26}"
print(header)
print(divider)

for r in rows:
    title = r["title"]
    if len(title) > COL_TITLE:
        title = title[:COL_TITLE - 3] + "..."
    print(f"{r['task_id']:<{COL_TASK}}  {title:<{COL_TITLE}}  "
          f"{r['issue']:<{COL_ISSUE}}  {r['pr']:<{COL_PR}}  {r['overall']}")

statuses = [r["overall"] for r in rows]
total        = len(statuses)
merged       = statuses.count("merged")
needs_review = statuses.count("needs_human_review")
failed       = sum(1 for s in statuses if s in ("workflow_failed", "pr_closed_without_merge"))
running      = sum(1 for s in statuses if s in ("workflow_running", "waiting_for_pr", "waiting_for_workflow"))
not_disp     = statuses.count("not_dispatched")
pct          = int(merged / total * 100) if total else 0

print()
print("Summary")
print(f"  Total:            {total}")
print(f"  Merged:           {merged} ({pct}%)")
print(f"  Needs review:     {needs_review}")
print(f"  Failed/blocked:   {failed}")
print(f"  Running/waiting:  {running}")
print(f"  Not dispatched:   {not_disp}")

print()
print("Next action:")
any_action = False
for r in rows:
    if r["overall"] == "needs_human_review":
        pr_ref = f"{r['pr']} ({r['pr_url']})" if r["pr_url"] else r["pr"]
        print(f"  - Review and merge PR {pr_ref} for {r['task_id']}")
        any_action = True
    elif r["overall"] in ("workflow_failed", "pr_closed_without_merge"):
        issue_ref = r["issue_url"] or r["issue"]
        print(f"  - Resolve {r['task_id']} ({r['overall']}): {issue_ref}")
        any_action = True
    elif r["overall"] == "not_dispatched":
        print(f"  - Dispatch {r['task_id']}: {r['title'][:60]}")
        any_action = True
if not any_action:
    if merged == total and total > 0:
        print("  All tasks merged. Plan is complete.")
    else:
        print("  Waiting for workflows to run or PRs to be created.")
PY

# ---------------------------------------------------------------------------
# Determine if all tasks are merged (used by both --write-back and --refresh-tracker)
# ---------------------------------------------------------------------------
ALL_MERGED="$(python3 - "$RESULTS_FILE" <<'PY'
import sys
rows = []
with open(sys.argv[1], "r") as f:
    for line in f:
        line = line.rstrip('\n')
        if not line: continue
        parts = line.split('\t')
        rows.append(parts[4] if len(parts) > 4 else "")
print("yes" if rows and all(s == "merged" for s in rows) else "no")
PY
)"

# ---------------------------------------------------------------------------
# --write-back: update runs.jsonl status fields + plans index
# ---------------------------------------------------------------------------
if [[ "$WRITE_BACK" == "true" ]]; then
  echo ""
  echo "Writing back status to runs.jsonl..."

  python3 - "$RUNS_FILE" "$RESULTS_FILE" <<'PY'
import json, sys, os
from datetime import datetime, timezone

runs_file, results_file = sys.argv[1], sys.argv[2]

# issue_number → observed status
observed = {}
with open(results_file, "r") as f:
    for line in f:
        line = line.rstrip('\n')
        if not line: continue
        parts = line.split('\t')
        iss     = parts[2] if len(parts) > 2 else ""
        overall = parts[4] if len(parts) > 4 else ""
        if iss and overall and overall not in ("not_dispatched", "unknown", ""):
            observed[iss] = overall

if not os.path.isfile(runs_file):
    print("  runs.jsonl not found; nothing to write back.")
    sys.exit(0)

records = []
with open(runs_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: records.append(json.loads(line))
            except Exception: pass

updated = 0
for rec in records:
    iss = str(rec.get("issue_number", ""))
    if iss in observed and rec.get("status") != observed[iss]:
        rec["status"] = observed[iss]
        rec["status_updated_at"] = datetime.now(timezone.utc).isoformat()
        updated += 1

with open(runs_file, "w", encoding="utf-8") as f:
    for rec in records:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")

print(f"  Updated {updated} run record(s).")
PY

  if [[ "$ALL_MERGED" == "yes" ]]; then
    echo "  All tasks merged — updating plans index to 'completed'..."
    python3 - "$PLANS_INDEX_FILE" "$IDEA_ID" <<'PY'
import json, sys
from datetime import datetime, timezone
plans_file, idea_id = sys.argv[1], sys.argv[2]
records = []
with open(plans_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: records.append(json.loads(line))
            except Exception: pass
for rec in records:
    if rec.get("idea_id") == idea_id:
        rec["status"] = "completed"
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
with open(plans_file, "w", encoding="utf-8") as f:
    for rec in records:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
print("  Plans index: status → completed.")
PY
  fi

  # Backfill tracker_issue_url if the index record was empty
  if [[ -n "$TRACKER_ISSUE_URL" ]]; then
    python3 - "$PLANS_INDEX_FILE" "$IDEA_ID" "$TRACKER_ISSUE_URL" <<'PY'
import json, sys
from datetime import datetime, timezone
plans_file, idea_id, tracker_url = sys.argv[1], sys.argv[2], sys.argv[3]
records = []
with open(plans_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: records.append(json.loads(line))
            except Exception: pass
updated = False
for rec in records:
    if rec.get("idea_id") == idea_id and not rec.get("tracker_issue_url"):
        rec["tracker_issue_url"] = tracker_url
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        updated = True
if updated:
    with open(plans_file, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print("  Plans index: backfilled tracker_issue_url.")
PY
  fi
fi

# ---------------------------------------------------------------------------
# --refresh-tracker: rebuild GitHub tracker issue checklist
# ---------------------------------------------------------------------------
if [[ "$REFRESH_TRACKER" == "true" ]]; then
  if [[ -z "$TRACKER_ISSUE_URL" ]]; then
    echo ""
    echo "  Cannot refresh tracker: tracker_issue_url is not set." >&2
    echo "  Run dispatch_plan.sh to create the tracker issue first." >&2
    exit 1
  fi

  echo ""
  echo "Refreshing tracker issue ${TRACKER_ISSUE_URL}..."

  TRACKER_REPO="$(echo "$TRACKER_ISSUE_URL" \
    | sed 's|https://github.com/||' | cut -d'/' -f1-2)"
  TRACKER_NUMBER="$(echo "$TRACKER_ISSUE_URL" | awk -F'/' '{print $NF}')"

  # Determine aggregate status label for the body
  if [[ "$ALL_MERGED" == "yes" ]]; then
    AGG_STATUS="completed"
  else
    AGG_STATUS="$(python3 - "$RESULTS_FILE" <<'PY'
import sys
rows = []
with open(sys.argv[1], "r") as f:
    for line in f:
        line = line.rstrip('\n')
        if not line: continue
        parts = line.split('\t')
        rows.append(parts[4] if len(parts) > 4 else "")
merged    = rows.count("merged")
not_disp  = rows.count("not_dispatched")
if not_disp == len(rows):
    print("dispatching")
else:
    print("dispatching")
PY
)"
  fi

  IDEA_TITLE="$(grep '^# Plan:' "$PLAN_FILE" 2>/dev/null \
    | sed 's/^# Plan: //' | head -1 || echo "$IDEA_ID")"

  BODY_FILE="$(mktemp)"
  python3 - "$RESULTS_FILE" "$IDEA_ID" "$IDEA_TITLE" \
    "$PRIMARY_PROJECT_ID" "$PLAN_ARTIFACT_REF" \
    "$CONTROL_PLANE_REPO" "$AGG_STATUS" > "$BODY_FILE" <<'PY'
import sys

(results_file, idea_id, idea_title, primary_project_id,
 artifact_ref, control_repo, agg_status) = sys.argv[1:]

rows = []
with open(results_file, "r") as f:
    for line in f:
        line = line.rstrip('\n')
        if not line: continue
        parts = line.split('\t')
        while len(parts) < 7: parts.append('')
        rows.append({
            "task_id": parts[0],
            "title":   parts[1],
            "issue":   f"#{parts[2]}" if parts[2] else "",
            "overall": parts[4],
            "pr":      parts[5],
        })

lines = []
for r in rows:
    check     = "x" if r["overall"] == "merged" else " "
    issue_ref = f" (issue {r['issue']})" if r["issue"] else ""
    pr_ref    = f", PR {r['pr']}" if r["pr"] else ""
    lines.append(f"- [{check}] {r['task_id']} — {r['title']}{issue_ref}{pr_ref}")

checklist = "\n".join(lines)

print(f"""# CreatorMesh Plan Tracker — {idea_title}

**Idea ID:** {idea_id}
**Primary project:** {primary_project_id}
**Plan artifact:** https://github.com/{control_repo}/tree/master/{artifact_ref}
**Status:** {agg_status}

## Tasks
{checklist}

## Notes
Each task is dispatched as a separate GitHub issue by `dispatch_plan.sh`.
Child task issues link back to this tracker and to the plan artifact.""")
PY

  gh issue edit "$TRACKER_NUMBER" \
    --repo "$TRACKER_REPO" \
    --body-file "$BODY_FILE"
  rm -f "$BODY_FILE"

  echo "  Tracker issue updated: ${TRACKER_ISSUE_URL}"
fi
