import {
  ConditionOutcome,
  ConditionResult,
  ConditionRule,
  EligibilityContext,
  EligibilityResult,
  RuleNode,
  isAllRule,
  isAnyRule,
  isConditionRule,
  isNotRule,
} from "./types";

function getField(context: EligibilityContext, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);
}

function compare(actual: unknown, operator: ConditionRule["operator"], expected: ConditionRule["value"]): boolean {
  switch (operator) {
    case ">=":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "<=":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case ">":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "<":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "=":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case "IN":
      return Array.isArray(expected) && (expected as Array<unknown>).includes(actual as never);
    case "NOT_IN":
      return Array.isArray(expected) && !(expected as Array<unknown>).includes(actual as never);
    default:
      return false;
  }
}

function evaluateCondition(rule: ConditionRule, context: EligibilityContext): ConditionResult {
  const actual = getField(context, rule.field);
  let outcome: ConditionOutcome;
  if (actual === undefined || actual === null) {
    outcome = "MISSING_INFORMATION";
  } else {
    outcome = compare(actual, rule.operator, rule.value) ? "SATISFIED" : "NOT_SATISFIED";
  }
  return {
    label: rule.label,
    field: rule.field,
    operator: rule.operator,
    expected: rule.value,
    actual: actual ?? null,
    outcome,
  };
}

/**
 * Ternary logic: SATISFIED / NOT_SATISFIED / MISSING_INFORMATION propagate
 * through AND/OR/NOT so an incomplete profile never silently reads as a
 * pass or a fail. MISSING dominates AND unless another branch already fails;
 * MISSING dominates OR unless another branch already succeeds.
 */
function evaluateNode(node: RuleNode, context: EligibilityContext): { outcome: ConditionOutcome; leaves: ConditionResult[] } {
  if (isConditionRule(node)) {
    const result = evaluateCondition(node, context);
    return { outcome: result.outcome, leaves: [result] };
  }
  if (isAllRule(node)) {
    const children = node.all.map((child) => evaluateNode(child, context));
    const leaves = children.flatMap((c) => c.leaves);
    if (children.some((c) => c.outcome === "NOT_SATISFIED")) return { outcome: "NOT_SATISFIED", leaves };
    if (children.some((c) => c.outcome === "MISSING_INFORMATION")) return { outcome: "MISSING_INFORMATION", leaves };
    return { outcome: "SATISFIED", leaves };
  }
  if (isAnyRule(node)) {
    const children = node.any.map((child) => evaluateNode(child, context));
    const leaves = children.flatMap((c) => c.leaves);
    if (children.some((c) => c.outcome === "SATISFIED")) return { outcome: "SATISFIED", leaves };
    if (children.some((c) => c.outcome === "MISSING_INFORMATION")) return { outcome: "MISSING_INFORMATION", leaves };
    return { outcome: "NOT_SATISFIED", leaves };
  }
  if (isNotRule(node)) {
    const child = evaluateNode(node.not, context);
    if (child.outcome === "MISSING_INFORMATION") return { outcome: "MISSING_INFORMATION", leaves: child.leaves };
    return { outcome: child.outcome === "SATISFIED" ? "NOT_SATISFIED" : "SATISFIED", leaves: child.leaves };
  }
  throw new Error("Unrecognized rule node");
}

export function evaluateEligibility(root: RuleNode, context: EligibilityContext): EligibilityResult {
  const { outcome, leaves } = evaluateNode(root, context);

  const satisfiedCount = leaves.filter((l) => l.outcome === "SATISFIED").length;
  const missingFields = [...new Set(leaves.filter((l) => l.outcome === "MISSING_INFORMATION").map((l) => l.field))];
  const completeness = leaves.length === 0 ? 100 : Math.round(((leaves.length - missingFields.length) / leaves.length) * 100);

  const verdict = outcome === "SATISFIED" ? "MATCH" : outcome === "MISSING_INFORMATION" ? "INCOMPLETE" : "NOT_MATCH";

  return {
    verdict,
    completeness,
    satisfiedCount,
    totalConditions: leaves.length,
    conditions: leaves,
    missingFields,
  };
}
