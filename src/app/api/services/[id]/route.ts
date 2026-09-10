import { NextRequest, NextResponse } from "next/server";
import { loadServiceWithRules } from "@/lib/eligibility/loadService";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const service = await loadServiceWithRules(id);
    if (!service) throw new AppError("SERVICE_NOT_FOUND", "Service not found.", 404);
    return NextResponse.json({ service });
  } catch (error) {
    return toErrorResponse(error);
  }
}
