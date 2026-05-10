/**
 * Integration Notes — CreatorMesh Console Phase 2+
 *
 * This file documents how each mock in Phase 1 maps to a real integration point.
 * It is not imported by any component — it serves as a living design reference.
 *
 * IMPORTANT: This client must remain side-effect free until connected through
 * a governed API boundary.
 */

/**
 * MOCK: createMockRun() in mockWorkflow.ts
 * REAL: POST /api/runs — calls LocalWorkflowRunner.run(input)
 *       The runner drives the Orchestrator which executes WorkflowDefinition steps.
 *
 * MOCK: deterministic step statuses set at construction time
 * REAL: Subscribe to Orchestrator run events (SSE or WebSocket) to update steps live.
 *
 * MOCK: MockClassification with hard-coded values
 * REAL: Output from ClaudeCodeRunnerAdapter after classify AgentStep completes.
 *
 * MOCK: acceptRun() / rejectRun() / requestChanges() transition state locally
 * REAL: POST /api/runs/:id/review — Orchestrator resumes at HumanReviewStep with decision.
 *       GovernanceEvaluator checks the decision against policy before proceeding.
 *
 * MOCK: MockResult with fake notion URL
 * REAL: Result returned by NotionConnectorAdapter after ConnectorStep completes.
 *       Real Notion page URL, content, and metadata.
 *
 * GOVERNANCE BOUNDARY:
 *   Every state transition that causes an external side effect (Notion write, Claude call)
 *   must pass through GovernanceEvaluator in the real backend.
 *   The UI should never call adapters directly.
 */

export {}
