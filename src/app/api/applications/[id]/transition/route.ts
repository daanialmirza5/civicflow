import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { assertTransition, ApplicationStatus } from "@/lib/workflow/stateMachine";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";

const bodySchema = z.object({
  toStatus: z.enum([
    "UNDER_REVIEW",
    "DOCUMENT_VERIFICATION",
    "ADDITIONAL_INFORMATION_REQUIRED",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ]),
  note: z.string().max(2000).optional(),
});

/** Staff-only status transitions (case worker / service admin / system admin). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN");
    const { id } = await params;
    const { toStatus, note } = bodySchema.parse(await req.json());

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) throw new AppError("APPLICATION_NOT_FOUND", "Application not found.", 404);

    const fromStatus = application.status as ApplicationStatus;
    assertTransition(fromStatus, toStatus as ApplicationStatus);

    const isTerminalDecision = toStatus === "APPROVED" || toStatus === "REJECTED";

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: { status: toStatus, decidedAt: isTerminalDecision ? new Date() : application.decidedAt },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          actor: `CASE_WORKER:${session.userId}`,
          action: "STATUS_CHANGED",
          fromStatus,
          toStatus,
          notes: note,
        },
      });
      if (toStatus === "APPROVED") {
        await tx.benefit.upsert({
          where: { applicationId: id },
          create: { applicationId: id, serviceId: application.serviceId, description: "Synthetic demo benefit granted." },
          update: {},
        });
      }
      return app;
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "APPLICATION_STATUS_CHANGED",
      entityType: "Application",
      entityId: id,
      previous: { status: fromStatus },
      next: { status: toStatus },
      reason: note,
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
