import type { WorkflowInput } from "./types.js";

/**
 * Resolve a reference string against workflow state.
 *
 * Supported patterns:
 *   "$input.fieldName"              → workflowInput[fieldName]
 *   "$steps.stepId.outputKey"       → stepOutputs[stepId].outputKey
 *   "$steps.stepId.key.subkey"      → deep traversal
 *   "$item"                         → the current fan-out item (passed as itemContext)
 *   "$item.fieldName"               → itemContext[fieldName]
 *
 * Returns undefined if any segment of the path is not found.
 */
export function resolveRef(
  ref: string,
  workflowInput: WorkflowInput,
  stepOutputs: Record<string, unknown>,
  itemContext?: unknown
): unknown {
  if (ref === "$item") return itemContext;

  if (ref.startsWith("$item.")) {
    const path = ref.slice("$item.".length).split(".");
    return deepGet(itemContext, path);
  }

  if (ref.startsWith("$input.")) {
    const key = ref.slice("$input.".length);
    return workflowInput[key];
  }

  if (ref.startsWith("$steps.")) {
    const parts = ref.slice("$steps.".length).split(".");
    const [stepId, ...rest] = parts;
    const stepOutput = stepOutputs[stepId!];
    return rest.length > 0 ? deepGet(stepOutput, rest) : stepOutput;
  }

  // Literal value
  return ref;
}

function deepGet(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Resolve all entries in a StepInputMapping.
 */
export function resolveInputMapping(
  mapping: Record<string, string>,
  workflowInput: WorkflowInput,
  stepOutputs: Record<string, unknown>,
  itemContext?: unknown
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, ref] of Object.entries(mapping)) {
    resolved[key] = resolveRef(ref, workflowInput, stepOutputs, itemContext);
  }
  return resolved;
}
