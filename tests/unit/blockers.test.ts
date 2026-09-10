import { describe, expect, it } from "vitest";
import { deriveBlockers } from "@/lib/workflow/blockers";

describe("blocker engine", () => {
  it("flags a missing required document, owned by the citizen", () => {
    const blockers = deriveBlockers({
      applicationId: "app-1",
      status: "UNDER_REVIEW",
      documents: [{ requirementId: "r1", requirementName: "Income certificate", necessity: "REQUIRED", status: "NOT_PROVIDED" }],
    });
    expect(blockers).toHaveLength(1);
    expect(blockers[0].reasonCode).toBe("DOCUMENT_MISSING");
    expect(blockers[0].owner).toBe("CITIZEN");
    expect(blockers[0].chain[0]).toBe("Application");
  });

  it("ignores optional documents", () => {
    const blockers = deriveBlockers({
      applicationId: "app-1",
      status: "UNDER_REVIEW",
      documents: [{ requirementId: "r1", requirementName: "Optional proof", necessity: "OPTIONAL", status: "NOT_PROVIDED" }],
    });
    expect(blockers.some((b) => b.reasonCode === "DOCUMENT_MISSING")).toBe(false);
  });

  it("falls back to REVIEW_PENDING owned by the department when all documents are in order", () => {
    const blockers = deriveBlockers({
      applicationId: "app-1",
      status: "UNDER_REVIEW",
      documents: [{ requirementId: "r1", requirementName: "Identity proof", necessity: "REQUIRED", status: "VERIFIED" }],
    });
    expect(blockers).toHaveLength(1);
    expect(blockers[0].reasonCode).toBe("REVIEW_PENDING");
    expect(blockers[0].owner).toBe("DEPARTMENT");
  });

  it("produces no blockers for terminal statuses", () => {
    expect(
      deriveBlockers({
        applicationId: "app-1",
        status: "APPROVED",
        documents: [{ requirementId: "r1", requirementName: "Income certificate", necessity: "REQUIRED", status: "NOT_PROVIDED" }],
      })
    ).toEqual([]);
  });

  it("flags ADDITIONAL_INFORMATION_REQUIRED as awaiting citizen response", () => {
    const blockers = deriveBlockers({
      applicationId: "app-1",
      status: "ADDITIONAL_INFORMATION_REQUIRED",
      documents: [],
    });
    expect(blockers.some((b) => b.reasonCode === "AWAITING_CITIZEN_RESPONSE")).toBe(true);
  });
});
