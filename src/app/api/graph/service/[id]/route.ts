import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isStaff } from "@/lib/auth/rbac";
import { loadServiceWithRules } from "@/lib/eligibility/loadService";
import { buildServiceGraph } from "@/lib/graph/build";
import { toErrorResponse, AppError } from "@/lib/errors";
import { collectRuleLabels } from "@/lib/eligibility/labels";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const service = await loadServiceWithRules(id);
    if (!service) throw new AppError("SERVICE_NOT_FOUND", "Service not found.", 404);

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    let applicationForGraph = null;
    if (applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { documents: true },
      });
      if (app) {
        if (!isStaff(session.role) ) {
          const owns = await prisma.citizenProfile.findFirst({ where: { id: app.citizenProfileId, userId: session.userId } });
          if (!owns) throw new AppError("FORBIDDEN", "You do not have access to this application.", 403);
        }
        applicationForGraph = {
          id: app.id,
          status: app.status,
          documents: app.documents.map((d) => ({ requirementId: d.requirementId, status: d.status })),
        };
      }
    }

    const graph = buildServiceGraph({
      serviceId: service.id,
      serviceName: service.name,
      departmentId: service.department.id,
      departmentName: service.department.name,
      ruleLabels: collectRuleLabels(service.rules),
      requirements: service.requirements.map((r) => ({ id: r.id, name: r.name, necessity: r.necessity })),
      application: applicationForGraph,
    });

    return NextResponse.json(graph);
  } catch (error) {
    return toErrorResponse(error);
  }
}
