// Application state machine. This is the single source of truth for which
// status transitions are legal — API routes and case-worker actions must
// call `assertTransition` before writing a new status; nothing else may
// mutate Application.status. See docs/application-workflow.md.

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCUMENT_VERIFICATION"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export const TERMINAL_STATUSES: ApplicationStatus[] = ["APPROVED", "REJECTED", "CANCELLED"];

const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["DOCUMENT_VERIFICATION", "APPROVED", "REJECTED", "CANCELLED"],
  DOCUMENT_VERIFICATION: ["UNDER_REVIEW", "ADDITIONAL_INFORMATION_REQUIRED", "APPROVED", "REJECTED", "CANCELLED"],
  ADDITIONAL_INFORMATION_REQUIRED: ["RESUBMITTED", "CANCELLED"],
  RESUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  constructor(public from: ApplicationStatus, public to: ApplicationStatus) {
    super(`Cannot transition application from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function allowedNextStatuses(from: ApplicationStatus): ApplicationStatus[] {
  return TRANSITIONS[from] ?? [];
}
