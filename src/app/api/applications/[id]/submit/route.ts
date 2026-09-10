import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isStaff, ForbiddenError } from "@/lib/auth/rbac";
import { assertApplicationAccess } from "@/lib/workflow/access";
import { assertTransition } from "@/lib/workflow/stateMachine";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";

/** Citizen-only: DRAFT -> SUBMITTED. Distinct from the staff transition endpoint. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (isStaff(session.role)) throw new ForbiddenError("Only the citizen who owns this application can submit it.");
    const { id } = await params;
    await assertApplicationAccess(session, id);

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) throw new AppError("APPLICATION_NOT_FOUND", "Application not found.", 404);

    assertTransition(application.status as never, "SUBMITTED");

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });
      await tx.applicationEvent.create({
        data: { applicationId: id, actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: application.status, toStatus: "SUBMITTED" },
      });
      return app;
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "APPLICATION_SUBMITTED",
      entityType: "Application",
      entityId: id,
      previous: { status: application.status },
      next: { status: "SUBMITTED" },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
