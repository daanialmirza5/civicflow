import { describe, expect, it } from "vitest";
import { rankServices } from "@/lib/eligibility/discovery";
import { EligibilityResult } from "@/lib/eligibility/types";

function result(overrides: Partial<EligibilityResult>): EligibilityResult {
  return {
    verdict: "MATCH",
    completeness: 100,
    satisfiedCount: 3,
    totalConditions: 3,
    conditions: [],
    missingFields: [],
    ...overrides,
  };
}

describe("service ranking", () => {
  it("ranks a full MATCH above an INCOMPLETE service", () => {
    const ranked = rankServices([
      { serviceId: "a", serviceName: "A", category: "EDUCATION", priority: 0, result: result({ verdict: "INCOMPLETE", satisfiedCount: 2, missingFields: ["x"] }) },
      { serviceId: "b", serviceName: "B", category: "EDUCATION", priority: 0, result: result({ verdict: "MATCH" }) },
    ]);
    expect(ranked[0].serviceId).toBe("b");
  });

  it("sinks NOT_MATCH to the bottom without hiding it", () => {
    const ranked = rankServices([
      { serviceId: "a", serviceName: "A", category: "EDUCATION", priority: 0, result: result({ verdict: "NOT_MATCH", satisfiedCount: 5 }) },
      { serviceId: "b", serviceName: "B", category: "EDUCATION", priority: 0, result: result({ verdict: "INCOMPLETE", satisfiedCount: 0, missingFields: ["x"] }) },
    ]);
    expect(ranked[0].serviceId).toBe("b");
    expect(ranked).toHaveLength(2);
  });
});
