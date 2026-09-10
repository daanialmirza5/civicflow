import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isStaff } from "@/lib/auth/rbac";
import { classifyDeadline, priorityForUrgency } from "@/lib/workflow/deadlines";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();

    const deadlines = await prisma.deadline.findMany({
      where: isStaff(session.role)
        ? {}
        : { OR: [{ application: { citizenProfile: { userId: session.userId } } }, { applicationId: null }] },
      include: { service: true, application: { include: { service: true } } },
      orderBy: { dueAt: "asc" },
    });

    const rows = deadlines.map((d) => {
      const urgency = classifyDeadline(d.dueAt, d.completedAt);
      return {
        id: d.id,
        kind: d.kind,
        label: d.label,
        dueAt: d.dueAt,
        completedAt: d.completedAt,
        urgency,
        priority: priorityForUrgency(urgency),
        serviceName: d.service?.name ?? d.application?.service.name ?? null,
        applicationId: d.applicationId,
      };
    });

    return NextResponse.json({ deadlines: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}
