import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/rbac";
import { assertApplicationAccess } from "@/lib/workflow/access";
import { loadApplicationDetail } from "@/lib/workflow/applicationDetail";
import { allowedNextStatuses } from "@/lib/workflow/stateMachine";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await assertApplicationAccess(session, id);

    const detail = await loadApplicationDetail(id);
    if (!detail) throw new AppError("APPLICATION_NOT_FOUND", "Application not found.", 404);

    return NextResponse.json({
      application: detail.application,
      blockers: detail.blockers,
      deadlines: detail.deadlines,
      progressPercent: detail.progressPercent,
      allowedNextStatuses: allowedNextStatuses(detail.application.status as never),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
