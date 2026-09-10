import { AIProvider, EvidenceItem, GroundedRequest } from "../types";

/**
 * Deterministic, template-based provider. Requires no API key and is the
 * default when no provider key is configured, so the app always works
 * end-to-end without external calls (build brief §27, §60 "fallback works").
 */
function summarizeEvidence(evidence: EvidenceItem[]): string {
  if (evidence.length === 0) return "no structured evidence was available";
  return evidence.map((e) => `${e.label} (${e.sourceType.toLowerCase().replace(/_/g, " ")})`).join("; ");
}

function templatedAnswer(request: GroundedRequest): string {
  const summary = summarizeEvidence(request.evidence);
  switch (request.agent) {
    case "ELIGIBILITY_EXPLANATION_AGENT":
      return `Based on the structured eligibility result (${summary}), the demo rules engine's determination is shown above. This reflects only the synthetic rules configured for this service, not an official government decision.`;
    case "DOCUMENT_AGENT":
      return `Based on the document records (${summary}), any document not marked VERIFIED still needs action before this application can advance.`;
    case "APPLICATION_AGENT":
      return `Based on the current application record (${summary}), the status and any open blockers shown above reflect the actual state of this demo application.`;
    case "DEADLINE_AGENT":
      return `Based on the deadline records (${summary}), please prioritize items marked OVERDUE or DUE_SOON.`;
    case "SERVICE_DISCOVERY_AGENT":
      return `Based on the ranked eligibility results (${summary}), services are ordered by how many known conditions they satisfy, not by predicted approval likelihood.`;
    case "TRANSLATION_AGENT":
      return request.question;
    case "CIVIC_NARRATOR":
    default:
      return `Based on the available structured evidence (${summary}), here is a plain-language summary. This is a synthetic demo answer, not an official determination.`;
  }
}

export const mockProvider: AIProvider = {
  name: "mock",
  isConfigured(): boolean {
    return true;
  },
  async generate(request: GroundedRequest): Promise<string> {
    return templatedAnswer(request);
  },
};
