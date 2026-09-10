import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { deriveBlockers } from "@/lib/workflow/blockers";
import { classifyDeadline } from "@/lib/workflow/deadlines";
import { summarizeBottlenecks, summarizeStatusDistribution } from "@/lib/analytics/bottlenecks";
import { ApplicationStatus } from "@/lib/workflow/stateMachine";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    await requireRole("CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN");

    const applications = await prisma.application.findMany({
      include: { documents: { include: { requirement: true } }, service: true },
    });

    const allBlockers = applications.flatMap((app) =>
      deriveBlockers({
        applicationId: app.id,
        status: app.status as ApplicationStatus,
        documents: app.documents.map((d) => ({
          requirementId: d.requirementId,
          requirementName: d.requirement.name,
          necessity: d.requirement.necessity,
          status: d.status,
        })),
      })
    );

    const bottlenecks = summarizeBottlenecks(allBlockers.map((b) => ({ reasonCode: b.reasonCode, reason: b.reason })));
    const statusDistribution = summarizeStatusDistribution(applications.map((a) => a.status));

    const decided = applications.filter((a) => a.decidedAt);
    const avgProcessingDays =
      decided.length === 0
        ? null
        : Math.round(
            (decided.reduce((sum, a) => sum + (a.decidedAt!.getTime() - a.createdAt.getTime()), 0) / decided.length) /
              86400000
          );

    const serviceDemand = new Map<string, number>();
    for (const app of applications) {
      serviceDemand.set(app.service.name, (serviceDemand.get(app.service.name) ?? 0) + 1);
    }

    const rejectedDocs = applications.flatMap((a) => a.documents).filter((d) => d.status === "REJECTED").length;
    const totalDocsActedOn = applications.flatMap((a) => a.documents).filter((d) => d.status !== "NOT_PROVIDED").length;

    const deadlines = await prisma.deadline.findMany();
    const overdueCount = deadlines.filter((d) => classifyDeadline(d.dueAt, d.completedAt) === "OVERDUE").length;

    return NextResponse.json({
      isDemoData: true,
      totalApplications: applications.length,
      statusDistribution,
      bottlenecks,
      avgProcessingDays,
      documentRejectionRate: totalDocsActedOn === 0 ? null : Math.round((rejectedDocs / totalDocsActedOn) * 1000) / 10,
      serviceDemand: [...serviceDemand.entries()].map(([serviceName, count]) => ({ serviceName, count })).sort((a, b) => b.count - a.count),
      overdueCount,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
