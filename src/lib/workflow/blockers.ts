// Application blocker engine: derives *why an application cannot currently
// advance* from its documents and status. Pure function over plain data so
// it is trivially unit-testable and reusable by the AI evidence layer
// (docs/application-workflow.md, §21/§49 of the build brief).

import { ApplicationStatus } from "./stateMachine";

export type DocumentStatus =
  | "NOT_PROVIDED"
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTION_REQUIRED";

export type RequirementNecessity = "REQUIRED" | "OPTIONAL" | "CONDITIONAL";

export interface BlockerDocumentInput {
  requirementId: string;
  requirementName: string;
  necessity: RequirementNecessity;
  status: DocumentStatus;
}

export interface BlockerInput {
  applicationId: string;
  status: ApplicationStatus;
  documents: BlockerDocumentInput[];
}

export type BlockerReasonCode =
  | "DOCUMENT_MISSING"
  | "DOCUMENT_REJECTED"
  | "DOCUMENT_CORRECTION_REQUIRED"
  | "REVIEW_PENDING"
  | "AWAITING_CITIZEN_RESPONSE";

export type BlockerOwner = "CITIZEN" | "DEPARTMENT" | "SYSTEM";

export interface DerivedBlocker {
  reasonCode: BlockerReasonCode;
  reason: string;
  requiredAction: string;
  owner: BlockerOwner;
  /** For the "why is this stuck?" causal chain UI. */
  chain: string[];
}

/** Causal-chain explanation for a single blocker, per §49 of the build brief. */
function documentChain(requirementName: string, status: DocumentStatus): string[] {
  const base = ["Application", `Required document: ${requirementName}`];
  if (status === "NOT_PROVIDED") return [...base, "Document not provided", "Verification cannot start", "Application blocked"];
  if (status === "REJECTED") return [...base, "Document rejected", "Verification failed", "Application blocked"];
  if (status === "CORRECTION_REQUIRED") return [...base, "Correction requested", "Awaiting citizen resubmission", "Application blocked"];
  return base;
}

export function deriveBlockers(input: BlockerInput): DerivedBlocker[] {
  if (input.status === "APPROVED" || input.status === "REJECTED" || input.status === "CANCELLED") {
    return [];
  }

  const blockers: DerivedBlocker[] = [];

  for (const doc of input.documents) {
    if (doc.necessity === "OPTIONAL") continue;

    if (doc.status === "NOT_PROVIDED") {
      blockers.push({
        reasonCode: "DOCUMENT_MISSING",
        reason: `${doc.requirementName} has not been provided.`,
        requiredAction: `Upload ${doc.requirementName}.`,
        owner: "CITIZEN",
        chain: documentChain(doc.requirementName, doc.status),
      });
    } else if (doc.status === "REJECTED") {
      blockers.push({
        reasonCode: "DOCUMENT_REJECTED",
        reason: `${doc.requirementName} was rejected during verification.`,
        requiredAction: `Re-upload a valid ${doc.requirementName}.`,
        owner: "CITIZEN",
        chain: documentChain(doc.requirementName, doc.status),
      });
    } else if (doc.status === "CORRECTION_REQUIRED") {
      blockers.push({
        reasonCode: "DOCUMENT_CORRECTION_REQUIRED",
        reason: `${doc.requirementName} requires correction.`,
        requiredAction: `Resubmit a corrected ${doc.requirementName}.`,
        owner: "CITIZEN",
        chain: documentChain(doc.requirementName, doc.status),
      });
    }
  }

  const hasCitizenBlocker = blockers.length > 0;

  if (!hasCitizenBlocker && (input.status === "UNDER_REVIEW" || input.status === "DOCUMENT_VERIFICATION")) {
    blockers.push({
      reasonCode: "REVIEW_PENDING",
      reason: "All required documents are provided; a case worker review is pending.",
      requiredAction: "Await case worker review.",
      owner: "DEPARTMENT",
      chain: ["Application", "All documents provided", "Case worker review pending", "Application awaiting decision"],
    });
  }

  if (input.status === "ADDITIONAL_INFORMATION_REQUIRED") {
    blockers.push({
      reasonCode: "AWAITING_CITIZEN_RESPONSE",
      reason: "The case worker requested additional information.",
      requiredAction: "Review the request and resubmit the application.",
      owner: "CITIZEN",
      chain: ["Application", "Case worker requested more information", "Awaiting citizen response", "Application blocked"],
    });
  }

  return blockers;
}
