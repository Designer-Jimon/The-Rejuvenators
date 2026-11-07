import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  departments,
  memberProfiles,
  notificationPreferences,
  notifications,
  permissions as permissionsTable,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
  worshipCenters,
} from "@/lib/db/schema";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/constants";
import { hashToken, randomToken } from "./password";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
  unreadNotifications: number;
  profile: {
    memberCode: string | null;
    avatarKey: string | null;
    coverKey: string | null;
    bio: string | null;
    address: string | null;
    occupation: string | null;
    gender: string | null;
    maritalStatus: string | null;
    country: string | null;
    state: string | null;
    lga: string | null;
    worshipCenterId: string | null;
    worshipCenterName: string | null;
    dateOfBirth: string | null;
    requestedDepartmentId: string | null;
    requestedDepartmentName: string | null;
    registrationStatus: string | null;
    memberStatus: string | null;
    followupStatus: string | null;
    followupNotes: string | null;
    showPhone: boolean;
    showEmail: boolean;
    showLastSeen: boolean;
    createdAt: Date | null;
  };
};

async function loadRolesAndPermissions(userId: string) {
  const db = await getDb();
  const [roleRows, permissionRows] = await Promise.all([
    db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId)),
    db
      .selectDistinct({ key: permissionsTable.key })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(
        permissionsTable,
        eq(permissionsTable.id, rolePermissions.permissionId),
      )
      .where(eq(userRoles.userId, userId)),
  ]);

  return {
    roles: roleRows.map((row) => row.key),
    permissions: permissionRows.map((row) => row.key),
  };
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionId = await hashToken(token);
  const db = await getDb();

  const rows = await db
    .select({
      user: users,
      profile: memberProfiles,
      departmentName: departments.name,
      worshipCenterName: worshipCenters.name,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(
      departments,
      eq(departments.id, memberProfiles.requestedDepartmentId),
    )
    .leftJoin(worshipCenters, eq(worshipCenters.id, memberProfiles.worshipCenterId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || row.user.status !== "active") return null;

  const [[{ value: unread }], access] = await Promise.all([
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, row.user.id),
          eq(notifications.isRead, false),
        ),
      ),
    loadRolesAndPermissions(row.user.id),
  ]);

  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    phone: row.user.phone,
    status: row.user.status,
    mustChangePassword: row.user.mustChangePassword,
    unreadNotifications: Number(unread ?? 0),
    roles: access.roles,
    permissions: access.permissions,
    profile: {
      memberCode: row.profile?.memberCode ?? null,
      avatarKey: row.profile?.avatarKey ?? null,
      coverKey: row.profile?.coverKey ?? null,
      bio: row.profile?.bio ?? null,
      address: row.profile?.address ?? null,
      occupation: row.profile?.occupation ?? null,
      gender: row.profile?.gender ?? null,
      maritalStatus: row.profile?.maritalStatus ?? null,
      country: row.profile?.country ?? null,
      state: row.profile?.state ?? null,
      lga: row.profile?.lga ?? null,
      worshipCenterId: row.profile?.worshipCenterId ?? null,
      worshipCenterName: row.worshipCenterName ?? null,
      dateOfBirth: row.profile?.dateOfBirth ?? null,
      requestedDepartmentId: row.profile?.requestedDepartmentId ?? null,
      requestedDepartmentName: row.departmentName ?? null,
      registrationStatus: row.profile?.registrationStatus ?? null,
      memberStatus: row.profile?.memberStatus ?? null,
      followupStatus: row.profile?.followupStatus ?? null,
      followupNotes: row.profile?.followupNotes ?? null,
      showPhone: row.profile?.showPhone ?? false,
      showEmail: row.profile?.showEmail ?? false,
      showLastSeen: row.profile?.showLastSeen ?? false,
      createdAt: row.profile?.createdAt ?? row.user.createdAt,
    },
  };
});

export async function createUserSession(userId: string) {
  const db = await getDb();
  const headerStore = await headers();
  const token = await randomToken(32);
  const sessionId = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    userAgent: headerStore.get("user-agent")?.slice(0, 500) ?? null,
    ipAddress:
      headerStore.get("cf-connecting-ip") ??
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null,
    expiresAt,
    lastSeenAt: new Date(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    const sessionId = await hashToken(token);
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function deleteOtherSessions(userId: string, keepToken?: string) {
  const db = await getDb();
  if (!keepToken) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return;
  }
  const keepId = await hashToken(keepToken);
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), sql`${sessions.id} <> ${keepId}`));
}

export async function getNotificationPreference(
  userId: string,
  type: string,
) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.type, type),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
