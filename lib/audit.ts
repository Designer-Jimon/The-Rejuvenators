import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function logAudit(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    details: input.details ?? null,
    ipAddress: input.ipAddress ?? null,
    createdAt: new Date(),
  });
}
