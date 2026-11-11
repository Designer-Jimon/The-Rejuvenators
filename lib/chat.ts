import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  chatReports,
  conversationParticipants,
  conversations,
  departmentLeaders,
  departmentMembers,
  departments,
  memberProfiles,
  messages,
  permissions as permissionsTable,
  rolePermissions,
  roles,
  userRoles,
  users,
  worshipCenters,
} from "@/lib/db/schema";
import { NOTIFICATION_TYPES, PERMISSIONS, ROLES } from "@/lib/constants";
import { notifyUser, notifyPermission } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";
import { mediaUrl } from "@/lib/media";

export const CHAT_BODY_LIMIT = 4000;
export const CHAT_PAGE_SIZE = 50;
export const ALL_CENTERS_PAIR_KEY = "all-centers";
export const ANNOUNCEMENT_ENABLED_KEY = "announcement_group_enabled";
export const ANNOUNCEMENT_REPLIES_KEY = "announcement_allow_replies";

export const GROUP_TYPES = ["department", "announcement"] as const;

export type ChatUserSummary = {
  id: string;
  name: string;
  avatarKey: string | null;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
};

export type ChatConversationSummary = {
  id: string;
  type: string;
  title: string;
  departmentId: string | null;
  centerId: string | null;
  lastMessageAt: Date | null;
  lastMessage: string | null;
  lastSenderName: string | null;
  unreadCount: number;
  otherUser: ChatUserSummary | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  kind: string;
  replyToId: string | null;
  attachmentKey: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
};

function directPairKey(first: string, second: string) {
  return [first, second].sort().join(":");
}

async function requireParticipant(conversationId: string, userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function participantIds(conversationId: string) {
  const db = await getDb();
  const rows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  return rows.map((row) => row.userId);
}

async function isAdminUser(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(
      permissionsTable,
      eq(permissionsTable.id, rolePermissions.permissionId),
    )
    .where(
      and(
        eq(userRoles.userId, userId),
        or(
          eq(roles.key, ROLES.superAdmin),
          eq(permissionsTable.key, PERMISSIONS.adminAccess),
        ),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function isActiveUnitLeader(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: departmentLeaders.id })
    .from(departmentLeaders)
    .where(
      and(
        eq(departmentLeaders.userId, userId),
        isNull(departmentLeaders.endedAt),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string,
) {
  if (userId === otherUserId) {
    throw new Error("You cannot start a conversation with yourself.");
  }
  const db = await getDb();
  const other = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(
      and(
        eq(users.id, otherUserId),
        eq(users.status, "active"),
        eq(memberProfiles.registrationStatus, "approved"),
      ),
    )
    .limit(1);
  if (!other[0]) throw new Error("That member is not available to message.");

  const pairKey = directPairKey(userId, otherUserId);
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.pairKey, pairKey))
    .limit(1);

  let conversationId = existing[0]?.id;
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    await db
      .insert(conversations)
      .values({
        id: conversationId,
        type: "direct",
        title: null,
        pairKey,
        createdBy: userId,
        lastMessageAt: new Date(),
      })
      .onConflictDoNothing();
    const created = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.pairKey, pairKey))
      .limit(1);
    conversationId = created[0]?.id ?? conversationId;
  }

  await db
    .insert(conversationParticipants)
    .values([
      { id: crypto.randomUUID(), conversationId, userId },
      { id: crypto.randomUUID(), conversationId, userId: otherUserId },
    ])
    .onConflictDoNothing();

  return conversationId;
}

async function syncParticipants(conversationId: string, ids: string[]) {
  const db = await getDb();
  const unique = [...new Set(ids)];
  if (unique.length > 0) {
    await db
      .insert(conversationParticipants)
      .values(
        unique.map((userId) => ({
          id: crypto.randomUUID(),
          conversationId,
          userId,
        })),
      )
      .onConflictDoNothing();
    await db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          notInArray(conversationParticipants.userId, unique),
        ),
      );
    return;
  }
  await db
    .delete(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
}

async function departmentCenterMemberIds(
  departmentId: string,
  centerId: string,
) {
  const db = await getDb();
  const [members, leaders] = await Promise.all([
    db
      .select({ userId: departmentMembers.userId })
      .from(departmentMembers)
      .innerJoin(users, eq(users.id, departmentMembers.userId))
      .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(
        and(
          eq(departmentMembers.departmentId, departmentId),
          eq(departmentMembers.isActive, true),
          eq(users.status, "active"),
          eq(memberProfiles.registrationStatus, "approved"),
          eq(memberProfiles.memberStatus, "active"),
          eq(memberProfiles.worshipCenterId, centerId),
        ),
      ),
    db
      .select({ userId: departmentLeaders.userId })
      .from(departmentLeaders)
      .innerJoin(users, eq(users.id, departmentLeaders.userId))
      .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(
        and(
          eq(departmentLeaders.departmentId, departmentId),
          isNull(departmentLeaders.endedAt),
          eq(users.status, "active"),
          eq(memberProfiles.registrationStatus, "approved"),
          eq(memberProfiles.memberStatus, "active"),
          or(
            eq(departmentLeaders.centerId, centerId),
            eq(memberProfiles.worshipCenterId, centerId),
          ),
        ),
      ),
  ]);
  return [...new Set([...members, ...leaders].map((row) => row.userId))];
}

export async function ensureDepartmentCenterConversation(
  departmentId: string,
  centerId: string,
  createdBy?: string | null,
) {
  const db = await getDb();
  const [department] = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(
      and(eq(departments.id, departmentId), eq(departments.isActive, true)),
    )
    .limit(1);
  const [center] = await db
    .select({ id: worshipCenters.id, name: worshipCenters.name })
    .from(worshipCenters)
    .where(
      and(
        eq(worshipCenters.id, centerId),
        eq(worshipCenters.isActive, true),
      ),
    )
    .limit(1);
  if (!department || !center) return null;

  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.type, "department"),
        eq(conversations.departmentId, departmentId),
        eq(conversations.centerId, centerId),
      ),
    )
    .limit(1);

  let conversationId = existing[0]?.id;
  const title = `${department.name} · ${center.name}`;
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    await db
      .insert(conversations)
      .values({
        id: conversationId,
        type: "department",
        title,
        departmentId,
        centerId,
        createdBy: createdBy ?? null,
        lastMessageAt: new Date(),
      })
      .onConflictDoNothing();
    const [created] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.type, "department"),
          eq(conversations.departmentId, departmentId),
          eq(conversations.centerId, centerId),
        ),
      )
      .limit(1);
    conversationId = created?.id ?? conversationId;
  } else {
    await db
      .update(conversations)
      .set({ title, isArchived: false })
      .where(eq(conversations.id, conversationId));
  }

  return conversationId;
}

export async function syncDepartmentCenterConversation(
  departmentId: string,
  centerId: string,
) {
  const db = await getDb();
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.type, "department"),
        eq(conversations.departmentId, departmentId),
        eq(conversations.centerId, centerId),
      ),
    )
    .limit(1);
  if (!conversation) {
    const id = await ensureDepartmentCenterConversation(departmentId, centerId);
    if (!id) return;
    return syncParticipants(
      id,
      await departmentCenterMemberIds(departmentId, centerId),
    );
  }
  await syncParticipants(
    conversation.id,
    await departmentCenterMemberIds(departmentId, centerId),
  );
}

export async function ensureDepartmentGroups(departmentId: string) {
  const db = await getDb();
  const centers = await db
    .select({ id: worshipCenters.id })
    .from(worshipCenters)
    .where(eq(worshipCenters.isActive, true));
  for (const center of centers) {
    const id = await ensureDepartmentCenterConversation(
      departmentId,
      center.id,
    );
    if (id) {
      await syncParticipants(
        id,
        await departmentCenterMemberIds(departmentId, center.id),
      );
    }
  }
}

export async function ensureCenterGroups(centerId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.isActive, true));
  for (const department of rows) {
    const id = await ensureDepartmentCenterConversation(
      department.id,
      centerId,
    );
    if (id) {
      await syncParticipants(
        id,
        await departmentCenterMemberIds(department.id, centerId),
      );
    }
  }
}

export async function archiveDepartmentConversations(departmentId: string) {
  const db = await getDb();
  await db
    .update(conversations)
    .set({ isArchived: true })
    .where(
      and(
        eq(conversations.type, "department"),
        eq(conversations.departmentId, departmentId),
      ),
    );
}

export async function archiveCenterConversations(centerId: string) {
  const db = await getDb();
  await db
    .update(conversations)
    .set({ isArchived: true })
    .where(eq(conversations.centerId, centerId));
}

export async function ensureAllCentersConversation(createdBy?: string | null) {
  const settings = await getSettings();
  const enabled = settings[ANNOUNCEMENT_ENABLED_KEY] !== "0";
  const db = await getDb();
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.pairKey, ALL_CENTERS_PAIR_KEY))
    .limit(1);

  if (!enabled) {
    if (existing[0]) {
      await db
        .update(conversations)
        .set({ isArchived: true })
        .where(eq(conversations.id, existing[0].id));
    }
    return null;
  }

  let conversationId = existing[0]?.id;
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    await db
      .insert(conversations)
      .values({
        id: conversationId,
        type: "announcement",
        title: "All Centers Announcements",
        pairKey: ALL_CENTERS_PAIR_KEY,
        createdBy: createdBy ?? null,
        lastMessageAt: new Date(),
      })
      .onConflictDoNothing();
    const [created] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.pairKey, ALL_CENTERS_PAIR_KEY))
      .limit(1);
    conversationId = created?.id ?? conversationId;
  } else {
    await db
      .update(conversations)
      .set({ isArchived: false })
      .where(eq(conversations.id, conversationId));
  }
  return conversationId;
}

export async function syncAllCentersConversation() {
  const db = await getDb();
  const conversationId = await ensureAllCentersConversation();
  if (!conversationId) return;
  const rows = await db
    .select({ userId: memberProfiles.userId })
    .from(memberProfiles)
    .innerJoin(users, eq(users.id, memberProfiles.userId))
    .where(
      and(
        eq(memberProfiles.registrationStatus, "approved"),
        eq(memberProfiles.memberStatus, "active"),
        eq(users.status, "active"),
      ),
    );
  await syncParticipants(
    conversationId,
    rows.map((row) => row.userId),
  );
}

export async function getOrCreateDepartmentConversation(
  departmentId: string,
  createdBy?: string | null,
  centerId?: string | null,
) {
  const db = await getDb();
  let resolvedCenter = centerId ?? null;
  if (!resolvedCenter && createdBy) {
    const [profile] = await db
      .select({ centerId: memberProfiles.worshipCenterId })
      .from(memberProfiles)
      .where(eq(memberProfiles.userId, createdBy))
      .limit(1);
    resolvedCenter = profile?.centerId ?? null;
  }
  if (!resolvedCenter) {
    const [center] = await db
      .select({ id: worshipCenters.id })
      .from(worshipCenters)
      .where(eq(worshipCenters.isActive, true))
      .orderBy(asc(worshipCenters.sortOrder))
      .limit(1);
    resolvedCenter = center?.id ?? null;
  }
  if (!resolvedCenter) throw new Error("No worship center is available.");

  const conversationId = await ensureDepartmentCenterConversation(
    departmentId,
    resolvedCenter,
    createdBy ?? null,
  );
  if (!conversationId) throw new Error("Department not found.");
  await syncDepartmentCenterConversation(departmentId, resolvedCenter);
  return conversationId;
}

export async function syncDepartmentConversation(departmentId: string) {
  const db = await getDb();
  const rows = await db
    .select({ centerId: conversations.centerId })
    .from(conversations)
    .where(
      and(
        eq(conversations.type, "department"),
        eq(conversations.departmentId, departmentId),
      ),
    );
  for (const row of rows) {
    if (row.centerId) {
      await syncDepartmentCenterConversation(departmentId, row.centerId);
    }
  }
  await ensureDepartmentGroups(departmentId);
}

async function userTargetGroupIds(userId: string) {
  const db = await getDb();
  const [profile] = await db
    .select({
      departmentId: memberProfiles.requestedDepartmentId,
      centerId: memberProfiles.worshipCenterId,
      registrationStatus: memberProfiles.registrationStatus,
      memberStatus: memberProfiles.memberStatus,
      userStatus: users.status,
    })
    .from(memberProfiles)
    .innerJoin(users, eq(users.id, memberProfiles.userId))
    .where(eq(memberProfiles.userId, userId))
    .limit(1);
  if (!profile) return [] as string[];

  const eligible =
    profile.registrationStatus === "approved" &&
    profile.memberStatus === "active" &&
    profile.userStatus === "active";
  if (!eligible) return [] as string[];

  const target: string[] = [];
  if (profile.departmentId && profile.centerId) {
    const id = await ensureDepartmentCenterConversation(
      profile.departmentId,
      profile.centerId,
      userId,
    );
    if (id) target.push(id);
  }
  const allCenters = await ensureAllCentersConversation(userId);
  if (allCenters) target.push(allCenters);
  return target;
}

export async function syncUserChatGroups(userId: string) {
  const db = await getDb();
  const target = await userTargetGroupIds(userId);

  if (target.length > 0) {
    await db
      .insert(conversationParticipants)
      .values(
        target.map((conversationId) => ({
          id: crypto.randomUUID(),
          conversationId,
          userId,
        })),
      )
      .onConflictDoNothing();
  }

  const stale = await db
    .select({
      id: conversationParticipants.id,
      conversationId: conversationParticipants.conversationId,
    })
    .from(conversationParticipants)
    .innerJoin(
      conversations,
      eq(conversations.id, conversationParticipants.conversationId),
    )
    .where(
      and(
        eq(conversationParticipants.userId, userId),
        inArray(conversations.type, [...GROUP_TYPES]),
      ),
    );

  const removeIds = stale
    .filter((row) => !target.includes(row.conversationId))
    .map((row) => row.id);
  if (removeIds.length > 0) {
    await db
      .delete(conversationParticipants)
      .where(inArray(conversationParticipants.id, removeIds));
  }
  return target;
}

export async function backfillChatGroups() {
  const db = await getDb();
  await db
    .update(conversations)
    .set({ isArchived: true })
    .where(
      and(
        eq(conversations.type, "department"),
        isNull(conversations.centerId),
      ),
    );
  await ensureAllCentersConversation();
  const [centerRows, departmentRows] = await Promise.all([
    db
      .select({ id: worshipCenters.id })
      .from(worshipCenters)
      .where(eq(worshipCenters.isActive, true)),
    db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.isActive, true)),
  ]);
  for (const center of centerRows) {
    for (const department of departmentRows) {
      await syncDepartmentCenterConversation(department.id, center.id);
    }
  }
  await syncAllCentersConversation();
  const members = await db
    .select({ userId: memberProfiles.userId })
    .from(memberProfiles)
    .innerJoin(users, eq(users.id, memberProfiles.userId))
    .where(
      and(
        eq(memberProfiles.registrationStatus, "approved"),
        eq(memberProfiles.memberStatus, "active"),
        eq(users.status, "active"),
      ),
    );
  for (const member of members) {
    await syncUserChatGroups(member.userId);
  }
  return { centers: centerRows.length, departments: departmentRows.length };
}

async function canPostToConversation(
  conversation: {
    id: string;
    type: string;
    isArchived: boolean;
  },
  userId: string,
) {
  if (conversation.isArchived) {
    throw new Error("This group is archived and no longer accepts messages.");
  }
  const admin = await isAdminUser(userId);
  const participant = await requireParticipant(conversation.id, userId);

  if (conversation.type === "direct") {
    if (!participant) throw new Error("Conversation not found.");
    return;
  }
  if (conversation.type === "announcement") {
    if (admin) return;
    const settings = await getSettings();
    const allowReplies = settings[ANNOUNCEMENT_REPLIES_KEY] === "1";
    if (allowReplies && participant) return;
    if (await isActiveUnitLeader(userId)) return;
    throw new Error("Only admins and unit leaders can post in this group.");
  }
  if (admin || participant) return;
  throw new Error("Only members of this group can post here.");
}

export async function listChatConversations(
  userId: string,
): Promise<ChatConversationSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: conversations.id,
      type: conversations.type,
      title: conversations.title,
      departmentId: conversations.departmentId,
      centerId: conversations.centerId,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      lastReadAt: conversationParticipants.lastReadAt,
      lastMessage: sql<string | null>`(
        select case when m.deleted_at is null then m.body else 'Message deleted' end
        from messages m
        where m.conversation_id = ${conversations.id}
        order by m.created_at desc
        limit 1
      )`,
      lastSenderName: sql<string | null>`(
        select u.name from messages m
        join users u on u.id = m.sender_id
        where m.conversation_id = ${conversations.id}
        order by m.created_at desc
        limit 1
      )`,
      unreadCount: sql<number>`(
        select count(*) from messages m
        where m.conversation_id = ${conversations.id}
          and m.sender_id <> ${userId}
          and m.deleted_at is null
          and m.created_at > coalesce(${conversationParticipants.lastReadAt}, 0)
      )`,
    })
    .from(conversationParticipants)
    .innerJoin(
      conversations,
      eq(conversations.id, conversationParticipants.conversationId),
    )
    .where(
      and(
        eq(conversationParticipants.userId, userId),
        eq(conversations.isArchived, false),
      ),
    );

  const directIds = rows
    .filter((row) => row.type === "direct")
    .map((row) => row.id);
  const others = new Map<string, ChatUserSummary>();
  if (directIds.length > 0) {
    const otherRows = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        id: users.id,
        name: users.name,
        avatarKey: memberProfiles.avatarKey,
        lastSeenAt: users.lastLoginAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(
        and(
          inArray(conversationParticipants.conversationId, directIds),
          ne(conversationParticipants.userId, userId),
        ),
      );
    for (const row of otherRows) {
      others.set(row.conversationId, {
        id: row.id,
        name: row.name,
        avatarKey: row.avatarKey,
        avatarUrl: mediaUrl(row.avatarKey),
        lastSeenAt: row.lastSeenAt,
      });
    }
  }

  return rows
    .map<ChatConversationSummary>((row) => {
      const otherUser = others.get(row.id) ?? null;
      return {
        id: row.id,
        type: row.type,
        title:
          row.type === "direct"
            ? otherUser?.name ?? row.title ?? "Direct message"
            : row.title ?? "Group chat",
        departmentId: row.departmentId,
        centerId: row.centerId,
        lastMessageAt: row.lastMessageAt ?? row.createdAt,
        lastMessage: row.lastMessage,
        lastSenderName: row.lastSenderName,
        unreadCount: Number(row.unreadCount ?? 0),
        otherUser,
      };
    })
    .sort(
      (left, right) =>
        (right.lastMessageAt?.getTime() ?? 0) -
        (left.lastMessageAt?.getTime() ?? 0),
    );
}

export async function getChatConversation(
  userId: string,
  conversationId: string,
) {
  if (!(await requireParticipant(conversationId, userId))) return null;
  const db = await getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  const conversation = rows[0];
  if (!conversation) return null;

  if (conversation.type === "direct") {
    const [other] = await db
      .select({
        id: users.id,
        name: users.name,
        avatarKey: memberProfiles.avatarKey,
        lastSeenAt: users.lastLoginAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          ne(conversationParticipants.userId, userId),
        ),
      )
      .limit(1);
    return {
      ...conversation,
      title: other?.name ?? "Direct message",
      otherUser: other
        ? {
            ...other,
            avatarUrl: mediaUrl(other.avatarKey),
          }
        : null,
    };
  }

  return { ...conversation, otherUser: null };
}

export async function listConversationMembers(
  userId: string,
  conversationId: string,
) {
  const db = await getDb();
  const [conversation] = await db
    .select({ id: conversations.id, type: conversations.type })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) throw new Error("Conversation not found.");
  if (!(await requireParticipant(conversationId, userId))) {
    throw new Error("Conversation not found.");
  }
  if (conversation.type === "direct") {
    throw new Error("Member lists are only available for group chats.");
  }
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarKey: memberProfiles.avatarKey,
      memberCode: memberProfiles.memberCode,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(eq(conversationParticipants.conversationId, conversationId))
    .orderBy(asc(users.name));
  return rows.map((row) => ({
    ...row,
    avatarUrl: mediaUrl(row.avatarKey),
  }));
}

export async function listChatMessages(
  userId: string,
  conversationId: string,
  options: { before?: string | null } = {},
) {
  if (!(await requireParticipant(conversationId, userId))) {
    throw new Error("Conversation not found.");
  }
  const db = await getDb();
  const beforeDate = options.before ? new Date(options.before) : null;
  const filters = [eq(messages.conversationId, conversationId)];
  if (beforeDate && !Number.isNaN(beforeDate.getTime())) {
    filters.push(lt(messages.createdAt, beforeDate));
  }

  const rows = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      senderName: users.name,
      senderAvatarKey: memberProfiles.avatarKey,
      body: messages.body,
      kind: messages.kind,
      replyToId: messages.replyToId,
      attachmentKey: messages.attachmentKey,
      attachmentName: messages.attachmentName,
      attachmentType: messages.attachmentType,
      attachmentSize: messages.attachmentSize,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(and(...filters))
    .orderBy(desc(messages.createdAt))
    .limit(CHAT_PAGE_SIZE);

  return rows
    .map<ChatMessage>((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      senderName: row.senderName,
      senderAvatarUrl: mediaUrl(row.senderAvatarKey),
      body: row.deletedAt ? "" : row.body,
      kind: row.kind,
      replyToId: row.replyToId,
      attachmentKey: row.deletedAt ? null : row.attachmentKey,
      attachmentUrl: row.deletedAt ? null : mediaUrl(row.attachmentKey),
      attachmentName: row.deletedAt ? null : row.attachmentName,
      attachmentType: row.deletedAt ? null : row.attachmentType,
      attachmentSize: row.deletedAt ? null : row.attachmentSize,
      editedAt: row.editedAt,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
    }))
    .reverse();
}

export async function sendChatMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
  kind?: string;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  replyToId?: string | null;
  notify?: boolean;
}) {
  const db = await getDb();
  const [conversation] = await db
    .select({
      id: conversations.id,
      type: conversations.type,
      title: conversations.title,
      isArchived: conversations.isArchived,
    })
    .from(conversations)
    .where(eq(conversations.id, input.conversationId))
    .limit(1);
  if (!conversation) throw new Error("Conversation not found.");

  await canPostToConversation(conversation, input.senderId);

  const [senderState] = await db
    .select({ chatMutedUntil: users.chatMutedUntil })
    .from(users)
    .where(eq(users.id, input.senderId))
    .limit(1);
  if (
    senderState?.chatMutedUntil &&
    senderState.chatMutedUntil.getTime() > Date.now()
  ) {
    throw new Error("You are muted from chat. Contact the church team.");
  }

  const body = input.body.trim();
  const hasAttachment = Boolean(input.attachmentKey);
  if (!body && !hasAttachment) throw new Error("Write a message first.");
  if (body.length > CHAT_BODY_LIMIT) {
    throw new Error(`Keep messages under ${CHAT_BODY_LIMIT} characters.`);
  }

  const message = {
    id: crypto.randomUUID(),
    conversationId: input.conversationId,
    senderId: input.senderId,
    body: body || (hasAttachment ? input.attachmentName ?? "Attachment" : ""),
    kind: input.kind ?? (hasAttachment ? "image" : "text"),
    replyToId: input.replyToId ?? null,
    attachmentKey: input.attachmentKey ?? null,
    attachmentName: input.attachmentName ?? null,
    attachmentType: input.attachmentType ?? null,
    attachmentSize: input.attachmentSize ?? null,
    createdAt: new Date(),
  };
  await db.insert(messages).values(message);
  await db
    .update(conversations)
    .set({ lastMessageAt: message.createdAt })
    .where(eq(conversations.id, input.conversationId));

  const isGroup =
    conversation.type === "department" || conversation.type === "announcement";
  const recipients = (await participantIds(input.conversationId)).filter(
    (id) => id !== input.senderId,
  );
  const isMention = isGroup && body.includes("@");
  if (input.notify !== false && (conversation.type === "direct" || isMention)) {
    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, input.senderId))
      .limit(1);
    const title = isMention
      ? `Mention in ${conversation.title ?? "group chat"}`
      : `New message from ${sender?.name ?? "a member"}`;
    await Promise.all(
      recipients.map(async (userId) => {
        const unread = await conversationUnread(userId, input.conversationId);
        if (unread >= 3) return;
        await notifyUser(userId, {
          type: NOTIFICATION_TYPES.chatMessage,
          title,
          body: body.slice(0, 140) || "Sent an attachment",
          link: `/member/chat?c=${input.conversationId}`,
        });
      }),
    );
  }

  const [sender] = await db
    .select({
      name: users.name,
      avatarKey: memberProfiles.avatarKey,
    })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(eq(users.id, input.senderId))
    .limit(1);

  return {
    ...message,
    senderName: sender?.name ?? "Member",
    senderAvatarUrl: mediaUrl(sender?.avatarKey),
    attachmentUrl: mediaUrl(message.attachmentKey),
  };
}

export async function markChatRead(userId: string, conversationId: string) {
  if (!(await requireParticipant(conversationId, userId))) {
    throw new Error("Conversation not found.");
  }
  const db = await getDb();
  const now = new Date();
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: now })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );
  return now;
}

async function conversationUnread(userId: string, conversationId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(
      conversationParticipants,
      and(
        eq(
          conversationParticipants.conversationId,
          messages.conversationId,
        ),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.deletedAt),
        gt(
          messages.createdAt,
          sql`coalesce(${conversationParticipants.lastReadAt}, 0)`,
        ),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function totalChatUnread(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(
      conversationParticipants,
      and(
        eq(
          conversationParticipants.conversationId,
          messages.conversationId,
        ),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .innerJoin(
      conversations,
      eq(conversations.id, messages.conversationId),
    )
    .where(
      and(
        ne(messages.senderId, userId),
        isNull(messages.deletedAt),
        eq(conversations.isArchived, false),
        gt(
          messages.createdAt,
          sql`coalesce(${conversationParticipants.lastReadAt}, 0)`,
        ),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function deleteChatMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  canModerate = false,
) {
  if (!(await requireParticipant(conversationId, userId)) && !canModerate) {
    throw new Error("Conversation not found.");
  }
  const db = await getDb();
  const [message] = await db
    .select({ senderId: messages.senderId, deletedAt: messages.deletedAt })
    .from(messages)
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.conversationId, conversationId),
      ),
    )
    .limit(1);
  if (!message) throw new Error("Message not found.");
  if (message.senderId !== userId && !canModerate) {
    throw new Error("You can only delete your own messages.");
  }
  if (!message.deletedAt) {
    await db
      .update(messages)
      .set({ body: "", deletedAt: new Date() })
      .where(eq(messages.id, messageId));
  }
}

export async function createChatReport(input: {
  reporterId: string;
  reporterName: string;
  conversationId: string;
  messageId?: string | null;
  reason: string;
}) {
  const db = await getDb();
  await db.insert(chatReports).values({
    id: crypto.randomUUID(),
    conversationId: input.conversationId,
    messageId: input.messageId ?? null,
    reporterId: input.reporterId,
    reason: input.reason,
    status: "open",
    createdAt: new Date(),
  });
  await notifyPermission(PERMISSIONS.memberManage, {
    type: NOTIFICATION_TYPES.adminNotice,
    title: "Chat reported",
    body: `${input.reporterName} reported a conversation: ${input.reason}`,
    link: "/admin/chat-moderation",
  });
}

export async function listChatContacts(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      avatarKey: memberProfiles.avatarKey,
      occupation: memberProfiles.occupation,
      departmentName: departments.name,
    })
    .from(users)
    .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(
      departments,
      eq(departments.id, memberProfiles.requestedDepartmentId),
    )
    .where(
      and(
        eq(users.status, "active"),
        eq(memberProfiles.registrationStatus, "approved"),
        ne(users.id, userId),
      ),
    )
    .orderBy(asc(users.name))
    .limit(120);
}

export async function ensureUserChatGroups(userId: string) {
  return syncUserChatGroups(userId);
}

export { requireParticipant };
