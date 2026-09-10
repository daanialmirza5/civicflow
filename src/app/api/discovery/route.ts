import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/rbac";
import { loadAllActiveServices } from "@/lib/eligibility/loadService";
import { evaluateEligibility } from "@/lib/eligibility/evaluate";
import { profileToContext } from "@/lib/eligibility/context";
import { rankServices } from "@/lib/eligibility/discovery";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await prisma.citizenProfile.findUnique({ where: { userId: session.userId } });
    if (!profile) throw new AppError("PROFILE_NOT_FOUND", "Citizen profile not found.", 404);

    const services = await loadAllActiveServices();
    const context = profileToContext(profile);

    const ranked = rankServices(
      services.map((s) => ({
        serviceId: s.id,
        serviceName: s.name,
        category: s.category,
        priority: s.priority,
        result: evaluateEligibility(s.rules, context),
      }))
    );

    return NextResponse.json({
      matches: ranked.map((r) => ({
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        category: r.category,
        verdict: r.result.verdict,
        completeness: r.result.completeness,
        satisfiedCount: r.result.satisfiedCount,
        totalConditions: r.result.totalConditions,
        missingFields: r.result.missingFields,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
