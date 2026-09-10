import { prisma } from "@/lib/db";
import { ForbiddenError } from "@/lib/auth/rbac";
import { SessionPayload } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

/**
 * Scoped authorization for a single application: staff may access any
 * application, a citizen may only access an application tied to their own
 * CitizenProfile. Every application route must call this — see
 * docs/security.md §"scoped application authorization".
 */
export async function assertApplicationAccess(session: SessionPayload, applicationId: string): Promise<void> {
  if (isStaff(session.role)) return;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { citizenProfile: { select: { userId: true } } },
  });
  if (!application || application.citizenProfile.userId !== session.userId) {
    throw new ForbiddenError("You do not have access to this application.");
  }
}
