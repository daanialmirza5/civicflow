export interface DocumentRow {
  id: string;
  requirementId: string;
  status: "NOT_PROVIDED" | "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "CORRECTION_REQUIRED";
  fileName: string | null;
  verificationNote: string | null;
  requirement: { id: string; name: string; description: string; necessity: string };
}

export interface EventRow {
  id: string;
  actor: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CaseNoteRow {
  id: string;
  note: string;
  createdAt: string;
  author: { name: string };
}

export interface DeadlineRow {
  id: string;
  label: string;
  dueAt: string;
  urgency: "OVERDUE" | "DUE_SOON" | "UPCOMING" | "COMPLETED";
}

export interface BlockerRow {
  reasonCode: string;
  reason: string;
  requiredAction: string;
  owner: "CITIZEN" | "DEPARTMENT" | "SYSTEM";
  chain: string[];
}

export interface ApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  service: { id: string; name: string; description: string };
  citizenProfile: { user: { name: string } };
  documents: DocumentRow[];
  events: EventRow[];
  deadlines: unknown[];
  caseNotes: CaseNoteRow[];
  benefit: { description: string } | null;
}

export interface ApplicationDetailResponse {
  application: ApplicationRow;
  blockers: BlockerRow[];
  deadlines: DeadlineRow[];
  progressPercent: number;
  allowedNextStatuses: string[];
}
