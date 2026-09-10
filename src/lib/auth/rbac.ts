import type { Role } from "@prisma/client";
import { SessionPayload, getSession } from "./session";

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not authorized for this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws UnauthorizedError if no valid session; call at the top of every protected route/action. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Throws ForbiddenError if the current session's role is not in `roles`. */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new ForbiddenError(`Requires one of: ${roles.join(", ")}`);
  return session;
}

export function isStaff(role: Role): boolean {
  return role === "CASE_WORKER" || role === "SERVICE_ADMIN" || role === "SYSTEM_ADMIN";
}
