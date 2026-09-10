import { describe, expect, it } from "vitest";
import { InvalidTransitionError, allowedNextStatuses, assertTransition, canTransition, isTerminal } from "@/lib/workflow/stateMachine";

describe("application state machine", () => {
  it("allows the documented happy path", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "DOCUMENT_VERIFICATION")).toBe(true);
    expect(canTransition("DOCUMENT_VERIFICATION", "ADDITIONAL_INFORMATION_REQUIRED")).toBe(true);
    expect(canTransition("ADDITIONAL_INFORMATION_REQUIRED", "RESUBMITTED")).toBe(true);
    expect(canTransition("RESUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canTransition("DRAFT", "UNDER_REVIEW")).toBe(false);
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransition("APPROVED", "UNDER_REVIEW")).toBe(false);
    expect(canTransition("REJECTED", "SUBMITTED")).toBe(false);
    expect(canTransition("CANCELLED", "DRAFT")).toBe(false);
  });

  it("throws InvalidTransitionError via assertTransition", () => {
    expect(() => assertTransition("DRAFT", "APPROVED")).toThrow(InvalidTransitionError);
  });

  it("identifies terminal statuses", () => {
    expect(isTerminal("APPROVED")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("DRAFT")).toBe(false);
  });

  it("lists allowed next statuses", () => {
    expect(allowedNextStatuses("UNDER_REVIEW")).toEqual(
      expect.arrayContaining(["DOCUMENT_VERIFICATION", "APPROVED", "REJECTED", "CANCELLED"])
    );
  });
});
