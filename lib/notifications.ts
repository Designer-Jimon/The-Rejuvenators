import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  memberProfiles,
  notificationPreferences,
  notifications,
  permissions as permissionsTable,
  rolePermissions,
  userRoles,
  users,
} from "@/lib/db/schema";

type NotificationInput = {
  type: string;
  title: string;
  body: string;
  link?: string | null;
};

async function preferenceAllows(userId: string, type: string) {
  const db = await getDb();
  const rows = await db
    .select({ inApp: notificationPreferences.inApp })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.type, type),
      ),
    )
    .limit(1);
  if (!rows[0]) return true;
  return Boolean(rows[0].inApp);
}

export async function notifyUser(userId: string, input: NotificationInput) {
  if (!(await preferenceAllows(userId, input.type))) return false;
  const db = await getDb();
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
    isRead: false,
    createdAt: new Date(),
  });
  return true;
}

export async function notifyMembers(input: NotificationInput) {
  const db = await getDb();
  const recipients = await db
    .selectDistinct({ userId: memberProfiles.userId })
    .from(memberProfiles)
    .innerJoin(users, eq(users.id, memberProfiles.userId))
    .where(
      and(
        eq(memberProfiles.registrationStatus, "approved"),
        eq(memberProfiles.memberStatus, "active"),
        eq(users.status, "active"),
      ),
    );

  const ids = recipients.map((row) => row.userId);
  if (ids.length === 0) return 0;

  const preferences = await db
    .select({
      userId: notificationPreferences.userId,
      inApp: notificationPreferences.inApp,
    })
    .from(notificationPreferences)
    .where(
      and(
        inArray(notificationPreferences.userId, ids),
        eq(notificationPreferences.type, input.type),
      ),
    );

  const blocked = new Set(
    preferences.filter((row) => !row.inApp).map((row) => row.userId),
  );
  const targets = ids.filter((id) => !blocked.has(id));
  if (targets.length === 0) return 0;

  await db.insert(notifications).values(
    targets.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      isRead: false,
      createdAt: new Date(),
    })),
  );

  return targets.length;
}

export async function notifyPermission(
  permission: string,
  input: NotificationInput,
) {
  const db = await getDb();
  const recipients = await db
    .selectDistinct({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(
      permissionsTable,
      eq(permissionsTable.id, rolePermissions.permissionId),
    )
    .where(eq(permissionsTable.key, permission));

  const ids = recipients.map((row) => row.userId);
  if (ids.length === 0) return 0;

  const allowed = await db
    .select({
      userId: notificationPreferences.userId,
      inApp: notificationPreferences.inApp,
    })
    .from(notificationPreferences)
    .where(
      and(
        inArray(notificationPreferences.userId, ids),
        eq(notificationPreferences.type, input.type),
      ),
    );

  const blocked = new Set(
    allowed.filter((row) => !row.inApp).map((row) => row.userId),
  );
  const targets = ids.filter((id) => !blocked.has(id));
  if (targets.length === 0) return 0;

  await db.insert(notifications).values(
    targets.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      isRead: false,
      createdAt: new Date(),
    })),
  );

  return targets.length;
}
