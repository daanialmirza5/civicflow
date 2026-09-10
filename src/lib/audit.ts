import { prisma } from "./db";

export interface AuditEntry {
  actorId?: string | null;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string;
  previous?: unknown;
  next?: unknown;
  reason?: string;
}

/**
 * Append-only audit log. There is deliberately no update/delete helper
 * exported from this module — every mutation of consequence in the app
 * should call this once, after the underlying write succeeds.
 */
export async function recordAuditEvent(entry: AuditEntry): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      actorId: entry.actorId ?? null,
      actorLabel: entry.actorLabel,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      previous: entry.previous !== undefined ? JSON.stringify(entry.previous) : null,
      next: entry.next !== undefined ? JSON.stringify(entry.next) : null,
      reason: entry.reason ?? null,
    },
  });
}
