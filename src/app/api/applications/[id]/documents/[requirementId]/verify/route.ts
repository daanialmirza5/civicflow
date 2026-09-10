import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";

const bodySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "CORRECTION_REQUIRED"]),
  note: z.string().max(2000).optional(),
});

/** Human-in-the-loop document verification — always a case worker action, never automatic. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; requirementId: string }> }) {
  try {
    const session = await requireRole("CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN");
    const { id, requirementId } = await params;
    const { status, note } = bodySchema.parse(await req.json());

    const existing = await prisma.applicationDocument.findUnique({
      where: { applicationId_requirementId: { applicationId: id, requirementId } },
    });
    if (!existing) throw new AppError("DOCUMENT_NOT_FOUND", "Document not found.", 404);
    if (existing.status === "NOT_PROVIDED") {
      throw new AppError("DOCUMENT_NOT_UPLOADED", "Cannot verify a document that has not been uploaded.", 409);
    }

    const updated = await prisma.applicationDocument.update({
      where: { id: existing.id },
      data: { status, verifiedById: session.userId, verificationNote: note ?? null },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId: id,
        actor: `CASE_WORKER:${session.userId}`,
        action: `DOCUMENT_${status}`,
        notes: note,
      },
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "DOCUMENT_VERIFICATION_DECIDED",
      entityType: "ApplicationDocument",
      entityId: updated.id,
      previous: { status: existing.status },
      next: { status },
      reason: note,
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
