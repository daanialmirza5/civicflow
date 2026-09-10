// Deterministic eligibility rule types.
//
// A rule tree is pure data (JSON-serializable), never code — it is stored on
// EligibilityRuleSet.rules and evaluated by evaluate.ts. The AI layer is
// never allowed to invent or evaluate these rules; it only explains results
// this engine already produced. See docs/eligibility-engine.md.

export type ComparisonOperator =
  | ">="
  | "<="
  | "="
  | "!="
  | ">"
  | "<"
  | "IN"
  | "NOT_IN";

export interface ConditionRule {
  field: string; // dot path into the evaluation context, e.g. "age" or "profile.income"
  operator: ComparisonOperator;
  value: string | number | boolean | Array<string | number>;
  label: string; // human-readable description shown in explanations, e.g. "Age at least 18"
}

export interface AllRule {
  all: RuleNode[];
  label?: string;
}

export interface AnyRule {
  any: RuleNode[];
  label?: string;
}

export interface NotRule {
  not: RuleNode;
  label?: string;
}

export type RuleNode = ConditionRule | AllRule | AnyRule | NotRule;

export function isConditionRule(node: RuleNode): node is ConditionRule {
  return "field" in node;
}
export function isAllRule(node: RuleNode): node is AllRule {
  return "all" in node;
}
export function isAnyRule(node: RuleNode): node is AnyRule {
  return "any" in node;
}
export function isNotRule(node: RuleNode): node is NotRule {
  return "not" in node;
}

/** Outcome of evaluating a single condition against a (possibly incomplete) profile. */
export type ConditionOutcome = "SATISFIED" | "NOT_SATISFIED" | "MISSING_INFORMATION";

export interface ConditionResult {
  label: string;
  field: string;
  operator: ComparisonOperator;
  expected: ConditionRule["value"];
  actual: unknown;
  outcome: ConditionOutcome;
}

/** Overall verdict. Never a probability — see docs/eligibility-engine.md. */
export type EligibilityVerdict = "MATCH" | "NOT_MATCH" | "INCOMPLETE";

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  /** 0-100: percentage of referenced fields that were present in the profile. */
  completeness: number;
  satisfiedCount: number;
  totalConditions: number;
  conditions: ConditionResult[];
  missingFields: string[];
}

/** Flat evaluation context: profile fields plus any service-specific answers. */
export type EligibilityContext = Record<string, unknown>;
