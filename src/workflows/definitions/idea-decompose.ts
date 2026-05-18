/**
 * Idea Decomposition Workflow — Multi-Role Pipeline
 *
 * Decomposes a raw idea brief into a full, reviewable execution tree:
 *
 *   PM Agent         → PRD + Epics
 *   Architect Agent  → Architecture + Features (per epic)
 *   Planner Agent    → Plan + Tasks (per feature)
 *   OP Agent         → Acceptance + Exec Plan (per feature)
 *
 * Human review gates are placed at the parent level between FanoutSteps.
 * Child workflows run to completion (no HumanReviewStep inside children).
 *
 * Phase A: FanoutSteps run sequentially (parallelism: 1).
 * Phase B: set parallelism: "unlimited" in TreeWorkflowRunner.
 *
 * Input:
 *   ideaId:   string   — e.g. "2026-05-18-creator-platform"
 *   brief:    string   — raw idea description
 *   repos:    string[] — IDs of existing managed repositories
 *   plansDir: string   — base path for artifacts (default "docs/plans")
 */
import type { WorkflowDefinition } from "../port.js";
import type { FanoutStep } from "../types.js";

// ── Child workflow: architecture for one epic ────────────────────────────────
// Runs ArchitectAgent, writes arch artifacts.
// Returns the full ArchitectAgentResult (including epicDir for downstream use).

const epicArchWorkflow: WorkflowDefinition = {
  workflowId: "epic-arch-v1",
  name: "Epic Architecture",
  version: "1",
  description: "Runs ArchitectAgent and writes arch artifacts for one epic.",
  inputSchema: {
    epic: "EpicSpec — epic to architect",
    prd: "string — full PRD markdown",
    ideaId: "string",
    plansDir: "string",
  },
  steps: [
    {
      stepId: "arch-analysis",
      name: "Architect Analysis",
      type: "agent",
      description: "ArchitectAgent produces architecture, features, risks, interfaces for this epic.",
      agentRole: "architect",
      inputMapping: {
        epic: "$input.epic",
        prd: "$input.prd",
        ideaId: "$input.ideaId",
        plansDir: "$input.plansDir",
      },
      outputKey: "arch-analysis",
      onSuccess: "write-arch-artifacts",
      onFailure: "fail",
    },
    {
      stepId: "write-arch-artifacts",
      name: "Write Architecture Artifacts",
      type: "connector",
      description: "Write arch.md, features.jsonl, risks.md, interfaces.md to docs/plans/.",
      connectorId: "filesystem",
      capabilityType: "create",
      resourceType: "files",
      inputMapping: {
        files: "$steps.arch-analysis.artifacts",
      },
      outputKey: "write-arch-artifacts",
      onSuccess: "complete",
      onFailure: "fail",
    },
  ],
  governanceCheckpoints: [],
};

// ── Child workflow: plan one feature ─────────────────────────────────────────
// Runs PlannerAgent, writes plan artifacts.
// Returns PlannerAgentResult including .feature and .featureDir for OP.

const featurePlanWorkflow: WorkflowDefinition = {
  workflowId: "feature-plan-v1",
  name: "Feature Planning",
  version: "1",
  description: "Runs PlannerAgent and writes plan.md + tasks.jsonl for one feature.",
  inputSchema: {
    feature: "FeatureSpec — feature to plan",
    arch: "string — full architecture markdown for this epic",
    ideaId: "string",
    epicId: "string",
    epicDir: "string",
    plansDir: "string",
  },
  steps: [
    {
      stepId: "plan-analysis",
      name: "Planner Analysis",
      type: "agent",
      description: "PlannerAgent produces plan.md and tasks.jsonl for this feature.",
      agentRole: "planner",
      inputMapping: {
        feature: "$input.feature",
        arch: "$input.arch",
        ideaId: "$input.ideaId",
        epicId: "$input.epicId",
        epicDir: "$input.epicDir",
        plansDir: "$input.plansDir",
      },
      outputKey: "plan-analysis",
      onSuccess: "write-plan-artifacts",
      onFailure: "fail",
    },
    {
      stepId: "write-plan-artifacts",
      name: "Write Plan Artifacts",
      type: "connector",
      description: "Write plan.md, tasks.jsonl, decision-log.md to docs/plans/.",
      connectorId: "filesystem",
      capabilityType: "create",
      resourceType: "files",
      inputMapping: {
        files: "$steps.plan-analysis.artifacts",
      },
      outputKey: "write-plan-artifacts",
      onSuccess: "complete",
      onFailure: "fail",
    },
  ],
  governanceCheckpoints: [],
};

// ── Child workflow: OP for one feature ───────────────────────────────────────
// Runs OPAgent, writes acceptance + exec-plan.

const featureOPWorkflow: WorkflowDefinition = {
  workflowId: "feature-op-v1",
  name: "Feature Operations Plan",
  version: "1",
  description: "Runs OPAgent and writes acceptance.md + exec-plan.yaml for one feature.",
  inputSchema: {
    feature: "FeatureSpec — the feature",
    tasks: "TaskSpec[] — the planned tasks",
    featureDir: "string — directory where plan artifacts live",
  },
  steps: [
    {
      stepId: "op-analysis",
      name: "OP Analysis",
      type: "agent",
      description: "OPAgent produces acceptance criteria and execution plan.",
      agentRole: "op",
      inputMapping: {
        feature: "$input.feature",
        tasks: "$input.tasks",
        featureDir: "$input.featureDir",
      },
      outputKey: "op-analysis",
      onSuccess: "write-op-artifacts",
      onFailure: "fail",
    },
    {
      stepId: "write-op-artifacts",
      name: "Write OP Artifacts",
      type: "connector",
      description: "Write acceptance.md and exec-plan.yaml to docs/plans/.",
      connectorId: "filesystem",
      capabilityType: "create",
      resourceType: "files",
      inputMapping: {
        files: "$steps.op-analysis.artifacts",
      },
      outputKey: "write-op-artifacts",
      onSuccess: "complete",
      onFailure: "fail",
    },
  ],
  governanceCheckpoints: [],
};

// ── Top-level idea decomposition workflow ────────────────────────────────────

export const ideaDecomposeWorkflow: WorkflowDefinition = {
  workflowId: "idea-decompose-v1",
  name: "Idea Decomposition — Multi-Role Pipeline",
  version: "1",
  description:
    "Takes a raw idea brief and decomposes it through PM → Architect → Planner → OP roles, " +
    "producing a full reviewed execution tree ready for Claude Code dispatch.",
  inputSchema: {
    ideaId: "string — e.g. 2026-05-18-creator-platform",
    brief: "string — raw idea description",
    repos: "string[] — existing managed repository IDs",
    plansDir: "string — base artifact path, default: docs/plans",
  },
  steps: [

    // ── 1. PM analysis ────────────────────────────────────────────────────
    {
      stepId: "pm-analysis",
      name: "PM Analysis",
      type: "agent",
      description: "PMAgent produces PRD and epic breakdown.",
      agentRole: "pm",
      inputMapping: {
        brief: "$input.brief",
        repos: "$input.repos",
        ideaId: "$input.ideaId",
        plansDir: "$input.plansDir",
      },
      outputKey: "pm-analysis",
      onSuccess: "write-pm-artifacts",
      onFailure: "fail",
    },

    // ── 2. Write PRD + epics.jsonl ────────────────────────────────────────
    {
      stepId: "write-pm-artifacts",
      name: "Write PM Artifacts",
      type: "connector",
      description: "Write prd.md and epics.jsonl to docs/plans/<ideaId>/.",
      connectorId: "filesystem",
      capabilityType: "create",
      resourceType: "files",
      inputMapping: {
        files: "$steps.pm-analysis.artifacts",
      },
      outputKey: "write-pm-artifacts",
      onSuccess: "review-prd",
      onFailure: "fail",
    },

    // ── 3. Human review: PRD ─────────────────────────────────────────────
    {
      stepId: "review-prd",
      name: "Review PRD",
      type: "human-review",
      description: "Human reviews the PRD and epic list before the Architecture phase.",
      prompt:
        "The PM has produced a PRD and epic breakdown.\n\n" +
        "Review: docs/plans/<ideaId>/prd.md and epics.jsonl\n\n" +
        "Accept to proceed to Architecture, or reject to revise the brief.",
      acceptLabel: "Approve PRD → Architecture phase",
      rejectLabel: "Reject — revise idea brief",
      onAccept: "architect-fanout",
      onReject: "fail",
      onSuccess: "architect-fanout",
      onFailure: "fail",
    },

    // ── 4. Architect fan-out (one per epic) ───────────────────────────────
    {
      stepId: "architect-fanout",
      name: "Architecture Fan-out",
      type: "fanout",
      description: "Run ArchitectAgent for each epic sequentially.",
      itemsMapping: "$steps.pm-analysis.epics",
      childWorkflow: epicArchWorkflow,
      childInputMapping: {
        epic: "$item",
        prd: "$steps.pm-analysis.prd",
        ideaId: "$input.ideaId",
        plansDir: "$input.plansDir",
      },
      joinPolicy: "all",
      parallelism: 1,
      onSuccess: "collect-features",
      onFailure: "fail",
    } satisfies FanoutStep,

    // ── 5. Collect features across all epics ─────────────────────────────
    {
      stepId: "collect-features",
      name: "Collect Features",
      type: "agent",
      description: "Aggregates features from all architect results into a flat list.",
      agentRole: "feature-collector",
      inputMapping: {
        archResults: "$steps.architect-fanout",
      },
      outputKey: "collect-features",
      onSuccess: "review-arch",
      onFailure: "fail",
    },

    // ── 6. Human review: architectures ───────────────────────────────────
    {
      stepId: "review-arch",
      name: "Review Architectures",
      type: "human-review",
      description: "Human reviews all epic architectures before the Planning phase.",
      prompt:
        "All epics have been architected.\n\n" +
        "Review: docs/plans/<ideaId>/<epic>/arch.md and features.jsonl\n\n" +
        "Accept to proceed to Planning, or reject to revise.",
      acceptLabel: "Approve all architectures → Planning phase",
      rejectLabel: "Reject — revise architecture",
      onAccept: "planner-fanout",
      onReject: "fail",
      onSuccess: "planner-fanout",
      onFailure: "fail",
    },

    // ── 7. Planner fan-out (one per feature) ──────────────────────────────
    {
      stepId: "planner-fanout",
      name: "Planning Fan-out",
      type: "fanout",
      description: "Run PlannerAgent for each feature sequentially.",
      itemsMapping: "$steps.collect-features.featureContexts",
      childWorkflow: featurePlanWorkflow,
      childInputMapping: {
        feature: "$item.feature",
        arch: "$item.arch",
        ideaId: "$input.ideaId",
        epicId: "$item.epicId",
        epicDir: "$item.epicDir",
        plansDir: "$input.plansDir",
      },
      joinPolicy: "all",
      parallelism: 1,
      onSuccess: "review-plans",
      onFailure: "fail",
    } satisfies FanoutStep,

    // ── 8. Human review: plans ────────────────────────────────────────────
    {
      stepId: "review-plans",
      name: "Review Plans",
      type: "human-review",
      description: "Human reviews all feature plans and tasks before the OP phase.",
      prompt:
        "All features have been planned.\n\n" +
        "Review: docs/plans/<ideaId>/<epic>/<feature>/plan.md and tasks.jsonl\n\n" +
        "Accept to proceed to Operations, or reject to revise.",
      acceptLabel: "Approve all plans → Operations phase",
      rejectLabel: "Reject — revise plans",
      onAccept: "op-fanout",
      onReject: "fail",
      onSuccess: "op-fanout",
      onFailure: "fail",
    },

    // ── 9. OP fan-out (one per feature) ──────────────────────────────────
    // Uses planner-fanout results, which include .feature and .featureDir.
    {
      stepId: "op-fanout",
      name: "Operations Fan-out",
      type: "fanout",
      description: "Run OPAgent for each feature sequentially.",
      itemsMapping: "$steps.planner-fanout",
      childWorkflow: featureOPWorkflow,
      childInputMapping: {
        feature: "$item.plan-analysis.feature",
        tasks: "$item.plan-analysis.tasks",
        featureDir: "$item.plan-analysis.featureDir",
      },
      joinPolicy: "all",
      parallelism: 1,
      onSuccess: "complete",
      onFailure: "fail",
    } satisfies FanoutStep,
  ],

  governanceCheckpoints: [
    {
      stepId: "review-prd",
      approvalRequirement: "always",
      reason: "PM output must be reviewed before the Architecture phase.",
    },
    {
      stepId: "review-arch",
      approvalRequirement: "always",
      reason: "Architecture must be reviewed before the Planning phase.",
    },
    {
      stepId: "review-plans",
      approvalRequirement: "always",
      reason: "Plans must be reviewed before the Operations phase.",
    },
  ],
};
