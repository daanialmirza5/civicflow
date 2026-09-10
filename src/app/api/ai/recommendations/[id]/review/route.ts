import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";

// Human-in-the-loop review of an AI answer (build brief §31). This never
// lets the AI itself change application state — a staff member explicitly
// marks an AI explanation as approved/edited/rejected, which is itself
// just a review record, not a trigger for any automatic mutation.
const bodySchema = z.object({
  decision: z.enum(["APPROVED", "EDITED", "REJECTED"]),
  editedAnswer: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN");
    const { id } = await params;
    const { decision, editedAnswer } = bodySchema.parse(await req.json());

    const existing = await prisma.aIRecommendation.findUnique({ where: { id } });
    if (!existing) throw new AppError("RECOMMENDATION_NOT_FOUND", "Recommendation not found.", 404);

    const updated = await prisma.aIRecommendation.update({
      where: { id },
      data: {
        status: decision,
        reviewerId: session.userId,
        reviewedAt: new Date(),
        answer: decision === "EDITED" && editedAnswer ? editedAnswer : existing.answer,
      },
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "AI_RECOMMENDATION_REVIEWED",
      entityType: "AIRecommendation",
      entityId: id,
      previous: { status: existing.status },
      next: { status: decision },
    });

    return NextResponse.json({ recommendation: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
