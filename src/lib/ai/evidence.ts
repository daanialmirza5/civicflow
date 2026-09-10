import { prisma } from "@/lib/db";
import { evaluateEligibility } from "@/lib/eligibility/evaluate";
import { profileToContext } from "@/lib/eligibility/context";
import { loadServiceWithRules } from "@/lib/eligibility/loadService";
import { loadApplicationDetail } from "@/lib/workflow/applicationDetail";
import { classifyDeadline, priorityForUrgency } from "@/lib/workflow/deadlines";
import { EvidenceItem } from "./types";

/**
 * Evidence collectors: every one of these reads only from deterministic,
 * already-computed engine output (eligibility evaluator, blocker engine,
 * deadline classifier) — never from an LLM. This is what "grounded" means
 * in docs/ai-architecture.md.
 */

export async function collectEligibilityEvidence(userId: string, serviceId: string): Promise<EvidenceItem[]> {
  const profile = await prisma.citizenProfile.findUnique({ where: { userId } });
  const service = await loadServiceWithRules(serviceId);
  if (!profile || !service) return [];
  const result = evaluateEligibility(service.rules, profileToContext(profile));
  return [
    {
      sourceType: "STRUCTURED_ELIGIBILITY_RESULT",
      label: `Eligibility result for ${service.name}`,
      data: { serviceName: service.name, ...result },
    },
  ];
}

export async function collectApplicationEvidence(applicationId: string): Promise<EvidenceItem[]> {
  const detail = await loadApplicationDetail(applicationId);
  if (!detail) return [];
  return [
    {
      sourceType: "STRUCTURED_APPLICATION_RECORD",
      label: `Application ${detail.application.id} (${detail.application.service.name})`,
      data: {
        status: detail.application.status,
        serviceName: detail.application.service.name,
        progressPercent: detail.progressPercent,
        blockers: detail.blockers,
      },
    },
    {
      sourceType: "STRUCTURED_DOCUMENT_RECORD",
      label: "Document statuses",
      data: {
        documents: detail.application.documents.map((d) => ({
          requirement: d.requirement.name,
          necessity: d.requirement.necessity,
          status: d.status,
          verificationNote: d.verificationNote,
        })),
      },
    },
  ];
}

export async function collectDeadlineEvidence(applicationId: string): Promise<EvidenceItem[]> {
  const deadlines = await prisma.deadline.findMany({ where: { applicationId } });
  return deadlines.map((d) => ({
    sourceType: "STRUCTURED_DEADLINE_RECORD" as const,
    label: d.label,
    data: {
      dueAt: d.dueAt,
      urgency: classifyDeadline(d.dueAt, d.completedAt),
      priority: priorityForUrgency(classifyDeadline(d.dueAt, d.completedAt)),
      completedAt: d.completedAt,
    },
  }));
}
