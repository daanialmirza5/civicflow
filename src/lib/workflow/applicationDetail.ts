import { prisma } from "@/lib/db";
import { deriveBlockers, BlockerDocumentInput } from "./blockers";
import { classifyDeadline } from "./deadlines";
import { ApplicationStatus } from "./stateMachine";

/**
 * Loads an application and computes its live blockers/deadline urgency from
 * current data. Blockers are always recomputed here rather than trusted
 * from the (historical) ApplicationBlocker table, so the "why is this
 * stuck?" view can never go stale relative to document/status changes.
 */
export async function loadApplicationDetail(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      service: { include: { department: true, requirements: true } },
      citizenProfile: { include: { user: true } },
      documents: { include: { requirement: true } },
      events: { orderBy: { createdAt: "asc" } },
      deadlines: true,
      caseNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      benefit: true,
    },
  });
  if (!application) return null;

  const blockerInputDocs: BlockerDocumentInput[] = application.documents.map((d) => ({
    requirementId: d.requirementId,
    requirementName: d.requirement.name,
    necessity: d.requirement.necessity,
    status: d.status,
  }));
  const blockers = deriveBlockers({
    applicationId: application.id,
    status: application.status as ApplicationStatus,
    documents: blockerInputDocs,
  });

  const deadlines = application.deadlines.map((d) => ({
    ...d,
    urgency: classifyDeadline(d.dueAt, d.completedAt),
  }));

  const requiredTotal = application.service.requirements.filter((r) => r.necessity === "REQUIRED").length;
  const requiredSatisfied = application.documents.filter(
    (d) => d.requirement.necessity === "REQUIRED" && d.status === "VERIFIED"
  ).length;
  const progressPercent = requiredTotal === 0 ? 100 : Math.round((requiredSatisfied / requiredTotal) * 100);

  return { application, blockers, deadlines, progressPercent };
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof loadApplicationDetail>>>;
