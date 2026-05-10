// GovernancePermissionLevel unifies connector PermissionLevel and runner RunnerPermissionLevel
// so governance can evaluate both without importing from those modules.
export type GovernancePermissionLevel =
  | "safe-read"
  | "write"
  | "destructive"
  | "execute"
  | "external-side-effect"
  | "human";

export type GovernanceDecision = {
  decision: "auto-approved" | "denied" | "requires-approval";
  reason: string;
};

/**
 * Stateless evaluator that maps a permission level to a governance decision.
 *
 * MVP conservative policy:
 *   safe-read                → auto-approved (no side effects)
 *   human                   → auto-approved (handled by HumanReviewStep in the workflow)
 *   destructive              → denied (always; no override in MVP)
 *   write / execute /
 *     external-side-effect  → auto-approved when a prior HumanReviewStep accepted;
 *                             requires-approval otherwise
 */
export class GovernanceEvaluator {
  evaluate(
    permissionLevel: GovernancePermissionLevel,
    humanReviewApproved: boolean
  ): GovernanceDecision {
    switch (permissionLevel) {
      case "safe-read":
        return {
          decision: "auto-approved",
          reason: "safe-read operations are auto-approved",
        };

      case "human":
        return {
          decision: "auto-approved",
          reason: "human runner steps are auto-approved at dispatch",
        };

      case "destructive":
        return {
          decision: "denied",
          reason: "destructive operations are denied by default in the MVP governance policy",
        };

      case "write":
      case "execute":
      case "external-side-effect":
        if (humanReviewApproved) {
          return {
            decision: "auto-approved",
            reason: "a prior human-review step accepted this workflow",
          };
        }
        return {
          decision: "requires-approval",
          reason: `${permissionLevel} operations require explicit human approval`,
        };

      default:
        return {
          decision: "denied",
          reason: `unknown permission level: ${String(permissionLevel)}`,
        };
    }
  }
}
