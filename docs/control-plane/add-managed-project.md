When to Add a Managed Project

Add a project when CreatorMesh should be able to dispatch tasks to that repository.

Examples:

idea-factory: collects product signals and generates startup idea candidates
future app projects
future agent workflow projects
future data collection or automation projects

Each managed project should have its own GitHub repository.

CreatorMesh should not directly store all project source code in the CreatorMesh repo.

Step 1: Create or Prepare the Target Repository

Create the target repository on GitHub.

Example:

CarterShi01/idea-factory

Clone it on the server if needed:

cd ~/workspace
git clone https://github.com/CarterShi01/idea-factory.git

If the repository is empty, initialize a minimal project structure first.

Step 2: Add Claude Code Workflow to the Target Repository

The target repository must contain the Claude Code GitHub Action workflow.

Example:

cd ~/workspace/idea-factory

mkdir -p .github/workflows
cp ~/workspace/creator-mesh/.github/workflows/claude.yml .github/workflows/claude.yml

git add .github/workflows/claude.yml
git commit -m "Add Claude Code workflow"
git push origin "$(git branch --show-current)"

Confirm GitHub recognizes the workflow:

gh workflow list --repo CarterShi01/idea-factory

Expected result:

Claude Code    active
Step 3: Configure GitHub Secret in the Target Repository

The target repository must have the Anthropic API key configured as a GitHub Actions secret.

gh secret set ANTHROPIC_API_KEY --repo CarterShi01/idea-factory

Confirm it exists:

gh secret list --repo CarterShi01/idea-factory

Expected result:

ANTHROPIC_API_KEY
Step 4: Install or Update Claude GitHub App Access

The Claude GitHub App must have access to the target repository.

Open:

https://github.com/apps/claude

Then configure repository access and make sure the target repository is selected.

Example:

CarterShi01/idea-factory

If the Claude GitHub App only has access to selected repositories, each new managed project must be added manually.

Step 5: Enable GitHub Actions Pull Request Permissions

The target repository must allow GitHub Actions to create pull requests.

Open the target repository settings:

https://github.com/CarterShi01/idea-factory/settings/actions

Find:

Workflow permissions

Set:

Read and write permissions

Also enable:

Allow GitHub Actions to create and approve pull requests

Without this setting, Claude Code may finish successfully, but the workflow can fail at the pull request creation step.

Typical failure symptom:

Run Claude Code                           success
Create pull request from Claude branch    failure
Step 6: Register the Project in Local CreatorMesh Runtime Config

The real runtime config is local and should not be committed to Git.

File:

~/creator-mesh-runtime/config/projects.yaml

Add the new project:

projects:
  - id: idea-factory
    repo: CarterShi01/idea-factory
    default_branch: master
    executor: claude-code
    allow_direct_merge: false
    allow_deploy: false

If the target repository uses main, set:

default_branch: main
Step 7: Update Example Project Registry

The example config should be committed to the CreatorMesh repository.

File:

configs/projects.example.yaml

Example:

projects:
  - id: creator-mesh
    repo: CarterShi01/creator-mesh
    default_branch: master
    executor: claude-code
    allow_direct_merge: false
    allow_deploy: false

  - id: idea-factory
    repo: CarterShi01/idea-factory
    default_branch: master
    executor: claude-code
    allow_direct_merge: false
    allow_deploy: false
Step 8: Dispatch a Test Task

From the CreatorMesh repository:

cd ~/workspace/creator-mesh

scripts/dispatch/create_claude_task.sh \
  --project idea-factory \
  --title "Build initial Idea Factory demo pipeline" \
  --body "Create the first simple demo pipeline for Idea Factory. The project goal is to collect product launch information, normalize it, and generate startup idea candidates. For this first version, do not build a web UI, database, or complex agent framework. Add a simple Python CLI structure with placeholder modules for source collection, normalization, idea generation, and Markdown/JSON output. Include a README section explaining how to run the demo. Keep the change small and focused."

Expected result:

Dispatch completed.
Project: idea-factory
Repo: CarterShi01/idea-factory
Issue: https://github.com/CarterShi01/idea-factory/issues/...
Run record: /root/creator-mesh-runtime/runs/runs.jsonl
Step 9: Check Workflow and Pull Request

Check workflow runs:

gh run list --repo CarterShi01/idea-factory --workflow "Claude Code" --limit 10

Watch the latest run:

RUN_ID=$(gh run list \
  --repo CarterShi01/idea-factory \
  --workflow "Claude Code" \
  --limit 10 \
  --json databaseId,conclusion \
  -q '[.[] | select(.conclusion != "skipped")][0].databaseId')

gh run watch "$RUN_ID" --repo CarterShi01/idea-factory

Check pull requests:

gh pr list --repo CarterShi01/idea-factory --state open --limit 10

Review the pull request before merging:

gh pr view --repo CarterShi01/idea-factory
gh pr diff --repo CarterShi01/idea-factory
Success Criteria

A new project is successfully managed by CreatorMesh when:

The project is registered in projects.yaml.
CreatorMesh can dispatch a task using project_id.
A GitHub issue is created in the target repository.
The @claude comment triggers Claude Code.
Claude Code modifies the target repository.
A claude/... branch is created.
A pull request is created.
A human can review and merge the result.
