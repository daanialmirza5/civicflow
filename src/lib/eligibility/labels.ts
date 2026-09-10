import { RuleNode, isAllRule, isAnyRule, isConditionRule, isNotRule } from "./types";

/** Flattens a rule tree into its leaf condition labels, for display in the graph explorer. */
export function collectRuleLabels(node: RuleNode): string[] {
  if (isConditionRule(node)) return [node.label];
  if (isAllRule(node)) return node.all.flatMap(collectRuleLabels);
  if (isAnyRule(node)) return node.any.flatMap(collectRuleLabels);
  if (isNotRule(node)) return collectRuleLabels(node.not).map((l) => `NOT: ${l}`);
  return [];
}
