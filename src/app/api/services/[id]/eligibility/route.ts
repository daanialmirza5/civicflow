import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/rbac";
import { loadServiceWithRules } from "@/lib/eligibility/loadService";
import { evaluateEligibility } from "@/lib/eligibility/evaluate";
import { profileToContext } from "@/lib/eligibility/context";
import { toErrorResponse, AppError } from "@/lib/errors";

// Accepts an optional `overrides` object so the "what if my situation
// changes?" explorer (build brief §50) can recompute eligibility against a
// hypothetical profile without ever writing to the citizen's real profile.
const bodySchema = z.object({
  overrides: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const service = await loadServiceWithRules(id);
    if (!service) throw new AppError("SERVICE_NOT_FOUND", "Service not found.", 404);

    const profile = await prisma.citizenProfile.findUnique({ where: { userId: session.userId } });
    if (!profile) throw new AppError("PROFILE_NOT_FOUND", "Citizen profile not found.", 404);

    let body: z.infer<typeof bodySchema> = {};
    try {
      const json = await req.json();
      body = bodySchema.parse(json);
    } catch {
      // No body / empty body is valid — evaluate against the real profile.
    }

    const baseContext = profileToContext(profile);
    const context = { ...baseContext, ...(body.overrides ?? {}) };
    // Normalize explicit nulls (used to represent "unset" in overrides) back to undefined.
    for (const key of Object.keys(context)) {
      if (context[key] === null) delete context[key];
    }

    const result = evaluateEligibility(service.rules, context);

    return NextResponse.json({
      serviceId: service.id,
      serviceName: service.name,
      isWhatIf: Boolean(body.overrides && Object.keys(body.overrides).length > 0),
      result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
