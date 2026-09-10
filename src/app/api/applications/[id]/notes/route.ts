import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse } from "@/lib/errors";

const bodySchema = z.object({ note: z.string().min(1).max(4000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN");
    const { id } = await params;
    const { note } = bodySchema.parse(await req.json());

    const created = await prisma.caseNote.create({
      data: { applicationId: id, authorId: session.userId, note },
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "CASE_NOTE_ADDED",
      entityType: "Application",
      entityId: id,
    });

    return NextResponse.json({ note: created }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
