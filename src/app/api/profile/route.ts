import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/rbac";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await prisma.citizenProfile.findUnique({ where: { userId: session.userId } });
    if (!profile) throw new AppError("PROFILE_NOT_FOUND", "Citizen profile not found.", 404);
    return NextResponse.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// All fields optional and nullable — the platform only ever asks for what a
// selected service actually needs (build brief §13's data-minimization rule).
const bodySchema = z.object({
  age: z.number().int().min(0).max(130).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  residency: z.string().max(200).nullable().optional(),
  annualIncome: z.number().int().min(0).nullable().optional(),
  employmentStatus: z.string().max(100).nullable().optional(),
  educationLevel: z.string().max(100).nullable().optional(),
  householdSize: z.number().int().min(0).max(50).nullable().optional(),
  dependents: z.number().int().min(0).max(50).nullable().optional(),
  businessOwner: z.boolean().nullable().optional(),
  housingStatus: z.string().max(100).nullable().optional(),
  disabilityStatus: z.boolean().nullable().optional(),
  studentStatus: z.boolean().nullable().optional(),
  agricultureLand: z.boolean().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const updates = bodySchema.parse(await req.json());

    const before = await prisma.citizenProfile.findUnique({ where: { userId: session.userId } });
    if (!before) throw new AppError("PROFILE_NOT_FOUND", "Citizen profile not found.", 404);

    const profile = await prisma.citizenProfile.update({ where: { userId: session.userId }, data: updates });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "PROFILE_UPDATED",
      entityType: "CitizenProfile",
      entityId: profile.id,
      previous: before,
      next: profile,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
