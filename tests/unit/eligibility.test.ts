import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "@/lib/eligibility/evaluate";
import { RuleNode } from "@/lib/eligibility/types";

const educationSupportRules: RuleNode = {
  all: [
    { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
    { field: "annualIncome", operator: "<=", value: 500000, label: "Annual income at most 500,000" },
    { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
  ],
};

describe("evaluateEligibility — AND logic", () => {
  it("returns MATCH when all conditions are satisfied", () => {
    const result = evaluateEligibility(educationSupportRules, { age: 20, annualIncome: 300000, residency: "Maharashtra" });
    expect(result.verdict).toBe("MATCH");
    expect(result.completeness).toBe(100);
    expect(result.satisfiedCount).toBe(3);
  });

  it("returns NOT_MATCH when income exceeds threshold, even with missing fields elsewhere", () => {
    const result = evaluateEligibility(educationSupportRules, { age: 20, annualIncome: 900000 });
    expect(result.verdict).toBe("NOT_MATCH");
  });

  it("returns INCOMPLETE when a field is missing and nothing has failed yet", () => {
    const result = evaluateEligibility(educationSupportRules, { age: 20, annualIncome: 300000 });
    expect(result.verdict).toBe("INCOMPLETE");
    expect(result.missingFields).toEqual(["residency"]);
    expect(result.completeness).toBeLessThan(100);
  });
});

describe("evaluateEligibility — OR logic", () => {
  const rule: RuleNode = {
    any: [
      { field: "studentStatus", operator: "=", value: true, label: "Is a student" },
      { field: "employmentStatus", operator: "=", value: "unemployed", label: "Is unemployed" },
    ],
  };

  it("MATCHes if any branch satisfied", () => {
    expect(evaluateEligibility(rule, { studentStatus: true, employmentStatus: "employed" }).verdict).toBe("MATCH");
  });

  it("is INCOMPLETE, not NOT_MATCH, when one branch fails and the other is missing", () => {
    const result = evaluateEligibility(rule, { studentStatus: false });
    expect(result.verdict).toBe("INCOMPLETE");
  });

  it("NOT_MATCHes when both branches fail with full information", () => {
    const result = evaluateEligibility(rule, { studentStatus: false, employmentStatus: "employed" });
    expect(result.verdict).toBe("NOT_MATCH");
  });
});

describe("evaluateEligibility — NOT logic", () => {
  const rule: RuleNode = { not: { field: "businessOwner", operator: "=", value: true, label: "Owns a business" } };

  it("inverts a satisfied condition", () => {
    expect(evaluateEligibility(rule, { businessOwner: true }).verdict).toBe("NOT_MATCH");
    expect(evaluateEligibility(rule, { businessOwner: false }).verdict).toBe("MATCH");
  });

  it("propagates missing information rather than guessing", () => {
    expect(evaluateEligibility(rule, {}).verdict).toBe("INCOMPLETE");
  });
});

describe("evaluateEligibility — IN / NOT_IN", () => {
  const rule: RuleNode = { field: "category", operator: "IN", value: ["A", "B"], label: "Category A or B" };

  it("matches membership", () => {
    expect(evaluateEligibility(rule, { category: "A" }).verdict).toBe("MATCH");
    expect(evaluateEligibility(rule, { category: "C" }).verdict).toBe("NOT_MATCH");
  });
});

describe("evaluateEligibility — nested composition", () => {
  const rule: RuleNode = {
    all: [
      { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
      {
        any: [
          { field: "disabilityStatus", operator: "=", value: true, label: "Has a disability" },
          { field: "studentStatus", operator: "=", value: true, label: "Is a student" },
        ],
      },
    ],
  };

  it("evaluates nested AND(OR) trees correctly", () => {
    expect(evaluateEligibility(rule, { age: 20, disabilityStatus: true }).verdict).toBe("MATCH");
    expect(evaluateEligibility(rule, { age: 20, disabilityStatus: false, studentStatus: false }).verdict).toBe("NOT_MATCH");
    expect(evaluateEligibility(rule, { age: 17, disabilityStatus: true }).verdict).toBe("NOT_MATCH");
  });
});
