import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/rbac";
import { assertApplicationAccess } from "@/lib/workflow/access";
import { askCivicAssistant } from "@/lib/ai/orchestrator";
import { collectApplicationEvidence, collectDeadlineEvidence, collectEligibilityEvidence } from "@/lib/ai/evidence";
import { AgentName, EvidenceItem } from "@/lib/ai/types";
import { toErrorResponse, AppError } from "@/lib/errors";

const bodySchema = z.object({
  agent: z.enum([
    "SERVICE_DISCOVERY_AGENT",
    "ELIGIBILITY_EXPLANATION_AGENT",
    "DOCUMENT_AGENT",
    "APPLICATION_AGENT",
    "DEADLINE_AGENT",
    "TRANSLATION_AGENT",
    "CIVIC_NARRATOR",
  ]),
  question: z.string().min(1).max(1000),
  serviceId: z.string().optional(),
  applicationId: z.string().optional(),
  language: z.enum(["en", "hi", "mr"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = bodySchema.parse(await req.json());

    if (body.applicationId) await assertApplicationAccess(session, body.applicationId);

    let evidence: EvidenceItem[] = [];
    if (body.agent === "ELIGIBILITY_EXPLANATION_AGENT" && body.serviceId) {
      evidence = await collectEligibilityEvidence(session.userId, body.serviceId);
    } else if ((body.agent === "APPLICATION_AGENT" || body.agent === "DOCUMENT_AGENT") && body.applicationId) {
      evidence = await collectApplicationEvidence(body.applicationId);
    } else if (body.agent === "DEADLINE_AGENT" && body.applicationId) {
      evidence = await collectDeadlineEvidence(body.applicationId);
    } else if (body.applicationId) {
      evidence = await collectApplicationEvidence(body.applicationId);
    } else if (body.serviceId) {
      evidence = await collectEligibilityEvidence(session.userId, body.serviceId);
    }

    if (evidence.length === 0) {
      throw new AppError("NO_EVIDENCE", "No structured evidence is available for this question yet.", 422);
    }

    const answer = await askCivicAssistant({
      agent: body.agent as AgentName,
      question: body.question,
      evidence,
      language: body.language,
    });

    const recommendation = await prisma.aIRecommendation.create({
      data: {
        applicationId: body.applicationId ?? null,
        agent: body.agent,
        question: body.question,
        answer: answer.answer,
        evidence: JSON.stringify(answer.evidence),
        provider: answer.provider,
        status: "SUGGESTED",
      },
    });

    return NextResponse.json({
      recommendationId: recommendation.id,
      agent: answer.agent,
      answer: answer.answer,
      evidence: answer.evidence,
      provider: answer.provider,
      usedFallback: answer.usedFallback,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
