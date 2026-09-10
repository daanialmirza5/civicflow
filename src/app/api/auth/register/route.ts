import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { toErrorResponse, AppError } from "@/lib/errors";
import { recordAuditEvent } from "@/lib/audit";

// Self-registration always creates a CITIZEN account. Staff/admin accounts are
// provisioned out-of-band (seed data / SYSTEM_ADMIN user management), never
// through this public endpoint — see docs/security.md.
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: body.name, role: "CITIZEN" },
    });
    await prisma.citizenProfile.create({ data: { userId: user.id } });
    await recordAuditEvent({ actorId: user.id, actorLabel: user.email, action: "USER_REGISTERED", entityType: "User", entityId: user.id });

    const token = await createSessionToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    await setSessionCookie(token);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
