import { describe, expect, it } from "vitest";
import { classifyDeadline, priorityForUrgency } from "@/lib/workflow/deadlines";

describe("deadline classification", () => {
  const now = new Date("2026-09-11T00:00:00Z");

  it("classifies overdue deadlines", () => {
    expect(classifyDeadline(new Date("2026-09-01T00:00:00Z"), null, now)).toBe("OVERDUE");
  });

  it("classifies due-soon deadlines within 7 days", () => {
    expect(classifyDeadline(new Date("2026-09-15T00:00:00Z"), null, now)).toBe("DUE_SOON");
  });

  it("classifies upcoming deadlines beyond 7 days", () => {
    expect(classifyDeadline(new Date("2026-10-01T00:00:00Z"), null, now)).toBe("UPCOMING");
  });

  it("classifies completed deadlines regardless of date", () => {
    expect(classifyDeadline(new Date("2026-09-01T00:00:00Z"), new Date("2026-09-05T00:00:00Z"), now)).toBe("COMPLETED");
  });

  it("maps urgency to priority", () => {
    expect(priorityForUrgency("OVERDUE")).toBe("HIGH");
    expect(priorityForUrgency("DUE_SOON")).toBe("MEDIUM");
    expect(priorityForUrgency("UPCOMING")).toBe("LOW");
  });
});
