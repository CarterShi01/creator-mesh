#!/usr/bin/env bash
set -euo pipefail

RUNS_FILE="${CREATORMESH_RUNS_FILE:-$HOME/creator-mesh-runtime/runs/runs.jsonl}"

PROJECT_ID=""
REPO=""
ISSUE_NUMBER=""
LATEST="false"

usage() {
  cat <<USAGE
Usage:
  $0 --latest
  $0 --project <project_id> --latest
  $0 --repo <owner/repo> --issue <issue_number>
  $0 --project <project_id> --issue <issue_number>

Examples:
  $0 --latest
  $0 --project idea-factory --latest
  $0 --repo CarterShi01/idea-factory --issue 1
  $0 --project idea-factory --issue 1
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --issue)
      ISSUE_NUMBER="${2:-}"
      shift 2
      ;;
    --latest)
      LATEST="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$LATEST" != "true" && -z "$ISSUE_NUMBER" ]]; then
  echo "Missing required argument: --issue or --latest" >&2
  usage
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required but not found." >&2
  exit 1
fi

if [[ -f "$RUNS_FILE" ]]; then
  RESOLVED="$(
python3 - "$RUNS_FILE" "$PROJECT_ID" "$REPO" "$ISSUE_NUMBER" "$LATEST" <<'PY'
import json
import sys

path, project_id, repo, issue_number, latest = sys.argv[1:]

matches = []

with open(path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue

        if project_id and item.get("project_id") != project_id:
            continue

        if repo and item.get("repo") != repo:
            continue

        if issue_number and str(item.get("issue_number")) != str(issue_number):
            continue

        matches.append(item)

if not matches:
    sys.exit(2)

item = matches[-1]

def clean(value):
    return str(value or "").replace("\t", " ").replace("\n", " ")

print("\t".join([
    clean(item.get("project_id")),
    clean(item.get("repo")),
    clean(item.get("issue_number")),
    clean(item.get("title")),
    clean(item.get("issue_url")),
]))
PY
)" || true

  if [[ -n "${RESOLVED:-}" ]]; then
    IFS=$'\t' read -r RESOLVED_PROJECT_ID RESOLVED_REPO RESOLVED_ISSUE_NUMBER RESOLVED_TITLE RESOLVED_ISSUE_URL <<< "$RESOLVED"

    if [[ -z "$PROJECT_ID" ]]; then
      PROJECT_ID="$RESOLVED_PROJECT_ID"
    fi

    if [[ -z "$REPO" ]]; then
      REPO="$RESOLVED_REPO"
    fi

    if [[ -z "$ISSUE_NUMBER" ]]; then
      ISSUE_NUMBER="$RESOLVED_ISSUE_NUMBER"
    fi
  fi
fi

if [[ -z "$REPO" ]]; then
  echo "Cannot determine repo. Use --repo <owner/repo> or provide a run record." >&2
  exit 1
fi

if [[ -z "$ISSUE_NUMBER" ]]; then
  echo "Cannot determine issue number. Use --issue <number> or --latest." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ISSUE_JSON_FILE="$TMP_DIR/issue.json"
RUNS_JSON_FILE="$TMP_DIR/runs.json"
PRS_JSON_FILE="$TMP_DIR/prs.json"
PRS_SEARCH_FILE="$TMP_DIR/prs_search.json"

if ! gh issue view "$ISSUE_NUMBER" \
  --repo "$REPO" \
  --json number,title,state,url,createdAt,updatedAt \
  > "$ISSUE_JSON_FILE" 2>/dev/null; then
  echo "Issue not found or inaccessible."
  echo "Repo: $REPO"
  echo "Issue: #$ISSUE_NUMBER"
  exit 1
fi

if ! gh run list \
  --repo "$REPO" \
  --workflow "Claude Code" \
  --event issue_comment \
  --limit 100 \
  --json databaseId,displayTitle,status,conclusion,createdAt,updatedAt,url,event,headBranch \
  > "$RUNS_JSON_FILE" 2>/dev/null; then
  echo "[]" > "$RUNS_JSON_FILE"
fi

if ! gh pr list \
  --repo "$REPO" \
  --state all \
  --limit 100 \
  --json number,title,state,url,mergedAt,headRefName,createdAt,updatedAt,isDraft \
  > "$PRS_JSON_FILE" 2>/dev/null; then
  echo "[]" > "$PRS_JSON_FILE"
fi

# Supplementary: search for PRs that reference the issue number via closes/fixes/resolves.
# This catches non-standard branch names (e.g. rebase/fix branches) that the primary
# branch-name match would miss.
if ! gh pr list \
  --repo "$REPO" \
  --state all \
  --search "is:pr #${ISSUE_NUMBER}" \
  --limit 20 \
  --json number,title,state,url,mergedAt,headRefName,createdAt,updatedAt,isDraft \
  > "$PRS_SEARCH_FILE" 2>/dev/null; then
  echo "[]" > "$PRS_SEARCH_FILE"
fi

python3 - "$PROJECT_ID" "$REPO" "$ISSUE_NUMBER" "$ISSUE_JSON_FILE" "$RUNS_JSON_FILE" "$PRS_JSON_FILE" "$PRS_SEARCH_FILE" <<'PY'
import json
import sys

project_id, repo, issue_number, issue_path, runs_path, prs_path, prs_search_path = sys.argv[1:]

with open(issue_path, "r", encoding="utf-8") as f:
    issue = json.load(f)

with open(runs_path, "r", encoding="utf-8") as f:
    runs = json.load(f)

with open(prs_path, "r", encoding="utf-8") as f:
    prs_primary = json.load(f)

with open(prs_search_path, "r", encoding="utf-8") as f:
    prs_search = json.load(f)

# Merge primary and search results, deduplicate by PR number.
seen_pr_numbers = set()
prs = []
for pr in prs_primary + prs_search:
    n = pr.get("number")
    if n not in seen_pr_numbers:
        seen_pr_numbers.add(n)
        prs.append(pr)

issue_title = issue.get("title") or ""
issue_state = issue.get("state") or ""
issue_url = issue.get("url") or ""

def created_key(item):
    return item.get("createdAt") or ""

matching_runs = []

for run in runs:
    display_title = run.get("displayTitle") or ""
    conclusion = run.get("conclusion")

    if not (
        display_title == issue_title
        or issue_title in display_title
        or display_title in issue_title
    ):
        continue

    # A skipped run is usually a later no-op trigger. It should not override
    # a real completed run or a merged PR.
    if conclusion == "skipped":
        continue

    matching_runs.append(run)

matching_runs.sort(key=created_key, reverse=True)
latest_run = matching_runs[0] if matching_runs else None

matching_prs = []

for pr in prs:
    pr_title = pr.get("title") or ""
    head_ref = pr.get("headRefName") or ""

    if (
        f"issue-{issue_number}" in head_ref
        or f"#{issue_number}" in pr_title
        or pr_title == issue_title
        or issue_title in pr_title
        or pr_title in issue_title
    ):
        matching_prs.append(pr)

matching_prs.sort(key=created_key, reverse=True)
latest_pr = matching_prs[0] if matching_prs else None

# PR state is the strongest final-state signal.
if latest_pr and (latest_pr.get("state") == "MERGED" or latest_pr.get("mergedAt")):
    overall = "merged"
elif latest_pr and latest_pr.get("state") == "OPEN":
    overall = "needs_human_review"
elif latest_pr and latest_pr.get("state") == "CLOSED":
    overall = "pr_closed_without_merge"
elif not latest_run:
    overall = "waiting_for_workflow"
elif latest_run.get("status") != "completed":
    overall = "workflow_running"
elif latest_run.get("conclusion") == "success":
    overall = "waiting_for_pr"
else:
    overall = "workflow_failed"

print("CreatorMesh Run Status")
print("======================")
print(f"Project: {project_id or '-'}")
print(f"Repo:    {repo}")
print(f"Issue:   #{issue_number} [{issue_state}] {issue_title}")
print(f"URL:     {issue_url}")
print()

print("Workflow")
print("--------")

if latest_run:
    print(f"Run ID:     {latest_run.get('databaseId')}")
    print(f"Status:     {latest_run.get('status')}")
    print(f"Conclusion: {latest_run.get('conclusion')}")
    print(f"Branch:     {latest_run.get('headBranch') or '-'}")
    print(f"URL:        {latest_run.get('url')}")
else:
    print("No non-skipped matching Claude Code workflow run found.")

print()

print("Pull Request")
print("------------")

if latest_pr:
    print(f"PR:      #{latest_pr.get('number')} [{latest_pr.get('state')}] {latest_pr.get('title')}")
    print(f"Branch:  {latest_pr.get('headRefName') or '-'}")
    print(f"Merged:  {latest_pr.get('mergedAt') or '-'}")
    print(f"Draft:   {latest_pr.get('isDraft')}")
    print(f"URL:     {latest_pr.get('url')}")
else:
    print("No matching pull request found.")

print()

print("Overall")
print("-------")
print(overall)

if overall == "needs_human_review":
    print()
    print("Next action: review the pull request and merge it if the change is acceptable.")
elif overall == "workflow_failed":
    print()
    print("Next action: inspect the workflow log with gh run view <run-id> --log-failed.")
elif overall == "waiting_for_pr":
    print()
    print("Next action: check whether the workflow has a PR creation step or whether the Claude branch was pushed.")
elif overall == "waiting_for_workflow":
    print()
    print("Next action: confirm the target repo has Claude Code workflow, Claude App access, and issue_comment trigger.")
elif overall == "merged":
    print()
    print("Next action: no action required. The pull request has been merged.")
PY
