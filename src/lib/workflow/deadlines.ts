// Deadline urgency classification. Pure function over real dates — never
// fabricates dates (build brief §46: "Use actual database dates").

export type DeadlineUrgency = "COMPLETED" | "OVERDUE" | "DUE_SOON" | "UPCOMING";

const DUE_SOON_WINDOW_DAYS = 7;

export function classifyDeadline(dueAt: Date, completedAt: Date | null, now: Date = new Date()): DeadlineUrgency {
  if (completedAt) return "COMPLETED";
  const msRemaining = dueAt.getTime() - now.getTime();
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
  if (daysRemaining < 0) return "OVERDUE";
  if (daysRemaining <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
  return "UPCOMING";
}

export function daysUntil(dueAt: Date, now: Date = new Date()): number {
  return Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export function priorityForUrgency(urgency: DeadlineUrgency): Priority {
  if (urgency === "OVERDUE") return "HIGH";
  if (urgency === "DUE_SOON") return "MEDIUM";
  return "LOW";
}
