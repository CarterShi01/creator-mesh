---
name: creator-interface-maintainer
description: Use after changing public behavior, exported types, module boundaries, cross-directory dependencies, or workflow contracts in CreatorMesh. Checks whether INTERFACE.md files need updates.
---

# Creator Interface Maintainer

Use this skill after a code or architecture change that may affect a module contract.

## When to Use

Use this skill when a change affects:

- Public concepts
- Exported types
- Inputs or outputs
- Allowed or disallowed dependencies
- Module invariants
- Workflow contracts
- Runner or connector boundaries

## Procedure

1. Review the changed files.
2. Identify which source directories were affected.
3. Read each affected directory's INTERFACE.md.
4. Compare the documented contract with the actual change.
5. Decide whether the interface document needs an update.
6. If needed, update the relevant INTERFACE.md.
7. If no update is needed, explain why.

## Output

Provide:

- Affected directories
- Interface files reviewed
- Interface updates made
- Interface updates not needed
- Any drift risk

## Rules

- Do not rewrite interface documents unnecessarily.
- Keep interface documents concise.
- Do not include implementation details unless they affect the public contract.
- If uncertain, suggest a minimal wording change and ask for approval.
