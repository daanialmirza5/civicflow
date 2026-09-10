import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, isStaff, ForbiddenError } from "@/lib/auth/rbac";
import { assertApplicationAccess } from "@/lib/workflow/access";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";

// Demo-only "upload": the citizen supplies a file name and a short text
// stand-in for content (no real file storage — see docs/security.md and
// build brief §3's synthetic-data requirement). Any text is treated as
// inert data, never executed or interpreted as instructions anywhere
// downstream (including by the AI layer — see docs/security.md §prompt-injection).
const bodySchema = z.object({
  requirementId: z.string().min(1),
  fileName: z.string().min(1).max(300),
  content: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (isStaff(session.role)) throw new ForbiddenError("Only the citizen who owns this application can upload documents.");
    const { id } = await params;
    await assertApplicationAccess(session, id);

    const { requirementId, fileName, content } = bodySchema.parse(await req.json());

    const existing = await prisma.applicationDocument.findUnique({
      where: { applicationId_requirementId: { applicationId: id, requirementId } },
    });
    if (!existing) throw new AppError("REQUIREMENT_NOT_FOUND", "This requirement does not apply to this application.", 404);

    const updated = await prisma.applicationDocument.update({
      where: { id: existing.id },
      data: { status: "UPLOADED", fileName, synthesizedContent: content ?? `Synthetic demo content for ${fileName}`, verifiedById: null, verificationNote: null },
    });

    await prisma.applicationEvent.create({
      data: { applicationId: id, actor: "CITIZEN", action: "DOCUMENT_UPLOADED", notes: `Uploaded for requirement ${requirementId}` },
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "DOCUMENT_UPLOADED",
      entityType: "ApplicationDocument",
      entityId: updated.id,
      previous: { status: existing.status },
      next: { status: "UPLOADED" },
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
