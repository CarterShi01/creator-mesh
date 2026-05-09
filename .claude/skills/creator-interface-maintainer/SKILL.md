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
7. Apply the bottom-up propagation check (see below).
8. If no update is needed, explain why.

## Bottom-Up Propagation Rule

After updating a module's INTERFACE.md, check whether the change ripples upward.

Update direction: implementation file → INTERFACE.md → DESIGN.md → README.md → dependent modules above.

Layer ordering from foundation to top:

1. `src/core`, `src/shared` — zero dependencies; changes here affect everything above
2. `src/triggers`, `src/intake`, `src/agents`, `src/runners`, `src/connectors`, `src/storage`, `src/governance`
3. `src/knowledge`, `src/orchestrator`, `src/outputs`
4. `src/workflows` — integrates all layers; highest propagation surface

After updating an INTERFACE.md, ask:

- Does any module at a higher layer depend on the changed contract?
- If yes, does that module's INTERFACE.md or DESIGN.md need a corresponding update?
- For changes in `src/core` or `src/shared`, assume propagation is likely — check at least the direct dependent modules.

Propagation stops when the change does not affect a higher layer's public contract, design assumptions, or invariants.

## Output

Provide:

- Affected directories
- Interface files reviewed
- Interface updates made
- Interface updates not needed
- Propagation check result: which higher-level modules were checked and whether they needed updates
- Any drift risk

## Rules

- Do not rewrite interface documents unnecessarily.
- Keep interface documents concise — higher layers should be more abstract, not more detailed.
- Do not include implementation details unless they affect the public contract.
- If uncertain, suggest a minimal wording change and ask for approval.
- Higher-layer interface documents should grow more abstract and concise as the layer is further from the implementation.
