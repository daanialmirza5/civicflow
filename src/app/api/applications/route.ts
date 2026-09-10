import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, isStaff } from "@/lib/auth/rbac";
import { loadServiceWithRules } from "@/lib/eligibility/loadService";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse, AppError } from "@/lib/errors";
import { deriveBlockers } from "@/lib/workflow/blockers";
import { ApplicationStatus } from "@/lib/workflow/stateMachine";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const blockedOnly = searchParams.get("blocked") === "true";

    const where = isStaff(session.role)
      ? { ...(statusFilter ? { status: statusFilter as never } : {}) }
      : {
          citizenProfile: { userId: session.userId },
          ...(statusFilter ? { status: statusFilter as never } : {}),
        };

    const applications = await prisma.application.findMany({
      where,
      include: {
        service: { include: { requirements: true } },
        citizenProfile: { include: { user: true } },
        documents: { include: { requirement: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    let rows = applications.map((app) => {
      const blockers = deriveBlockers({
        applicationId: app.id,
        status: app.status as ApplicationStatus,
        documents: app.documents.map((d) => ({
          requirementId: d.requirementId,
          requirementName: d.requirement.name,
          necessity: d.requirement.necessity,
          status: d.status,
        })),
      });
      return {
        id: app.id,
        status: app.status,
        serviceId: app.service.id,
        serviceName: app.service.name,
        citizenName: app.citizenProfile.user.name,
        citizenProfileId: app.citizenProfileId,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        blockerCount: blockers.length,
        blockers,
      };
    });

    if (blockedOnly) rows = rows.filter((r) => r.blockerCount > 0);

    return NextResponse.json({ applications: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const createSchema = z.object({ serviceId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (isStaff(session.role)) {
      throw new AppError("STAFF_CANNOT_APPLY", "Staff accounts cannot create citizen applications.", 403);
    }
    const { serviceId } = createSchema.parse(await req.json());

    const service = await loadServiceWithRules(serviceId);
    if (!service) throw new AppError("SERVICE_NOT_FOUND", "Service not found.", 404);

    const profile = await prisma.citizenProfile.findUnique({ where: { userId: session.userId } });
    if (!profile) throw new AppError("PROFILE_NOT_FOUND", "Citizen profile not found.", 404);

    const application = await prisma.application.create({
      data: {
        citizenProfileId: profile.id,
        serviceId: service.id,
        status: "DRAFT",
        documents: {
          create: service.requirements.map((r) => ({ requirementId: r.id, status: "NOT_PROVIDED" })),
        },
        events: {
          create: [{ actor: "CITIZEN", action: "APPLICATION_CREATED", fromStatus: null, toStatus: "DRAFT" }],
        },
      },
    });

    await recordAuditEvent({
      actorId: session.userId,
      actorLabel: session.email,
      action: "APPLICATION_CREATED",
      entityType: "Application",
      entityId: application.id,
      next: { serviceId: service.id, status: "DRAFT" },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
