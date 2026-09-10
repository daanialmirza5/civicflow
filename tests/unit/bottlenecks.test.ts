import { describe, expect, it } from "vitest";
import { summarizeBottlenecks, summarizeStatusDistribution } from "@/lib/analytics/bottlenecks";

describe("bottleneck summary", () => {
  it("computes counts and percentages from real rows only", () => {
    const summary = summarizeBottlenecks([
      { reasonCode: "DOCUMENT_MISSING", reason: "Income certificate missing" },
      { reasonCode: "DOCUMENT_MISSING", reason: "Enrollment proof missing" },
      { reasonCode: "REVIEW_PENDING", reason: "Awaiting review" },
    ]);
    expect(summary[0]).toMatchObject({ reasonCode: "DOCUMENT_MISSING", count: 2 });
    expect(summary[0].percentage).toBeCloseTo(66.7, 1);
  });

  it("returns an empty array for no data rather than fabricating stats", () => {
    expect(summarizeBottlenecks([])).toEqual([]);
  });
});

describe("status distribution", () => {
  it("counts applications per status", () => {
    const dist = summarizeStatusDistribution(["APPROVED", "APPROVED", "REJECTED"]);
    expect(dist).toEqual([
      { status: "APPROVED", count: 2 },
      { status: "REJECTED", count: 1 },
    ]);
  });
});
