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
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  conversationParticipants,
  conversations,
  departmentLeaders,
  departmentMembers,
  departments,
  memberProfiles,
  messages,
  users,
} from "@/lib/db/schema";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import { notifyUser } from "@/lib/notifications";
import { mediaUrl } from "@/lib/media";

export const CHAT_BODY_LIMIT = 4000;
export const CHAT_PAGE_SIZE = 50;

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

export async function getOrCreateDepartmentConversation(
  departmentId: string,
  createdBy?: string | null,
) {
  const db = await getDb();
  const department = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(and(eq(departments.id, departmentId), eq(departments.isActive, true)))
    .limit(1);
  if (!department[0]) throw new Error("Department not found.");

  let conversationId: string;
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.departmentId, departmentId))
    .limit(1);
  if (existing[0]) {
    conversationId = existing[0].id;
  } else {
    conversationId = crypto.randomUUID();
    await db
      .insert(conversations)
      .values({
        id: conversationId,
        type: "department",
        title: `${department[0].name} Department`,
        departmentId,
        createdBy: createdBy ?? null,
        lastMessageAt: new Date(),
      })
      .onConflictDoNothing();
    const created = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.departmentId, departmentId))
      .limit(1);
    conversationId = created[0]?.id ?? conversationId;
  }

  await syncDepartmentConversation(departmentId);
  return conversationId;
}

export async function syncDepartmentConversation(departmentId: string) {
  const db = await getDb();
  const conversation = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.departmentId, departmentId))
    .limit(1);
  if (!conversation[0]) return;

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
        ),
      ),
  ]);

  const ids = [...new Set([...members, ...leaders].map((row) => row.userId))];
  if (ids.length > 0) {
    await db
      .insert(conversationParticipants)
      .values(
        ids.map((userId) => ({
          id: crypto.randomUUID(),
          conversationId: conversation[0].id,
          userId,
        })),
      )
      .onConflictDoNothing();
    await db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversation[0].id),
          notInArray(conversationParticipants.userId, ids),
        ),
      );
  }
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
    .where(eq(conversationParticipants.userId, userId));

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
            : row.title ?? "Department chat",
        departmentId: row.departmentId,
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
  if (!(await requireParticipant(input.conversationId, input.senderId))) {
    throw new Error("Conversation not found.");
  }
  const body = input.body.trim();
  const hasAttachment = Boolean(input.attachmentKey);
  if (!body && !hasAttachment) throw new Error("Write a message first.");
  if (body.length > CHAT_BODY_LIMIT) {
    throw new Error(`Keep messages under ${CHAT_BODY_LIMIT} characters.`);
  }

  const db = await getDb();
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

  const [conversation] = await db
    .select({
      type: conversations.type,
      title: conversations.title,
    })
    .from(conversations)
    .where(eq(conversations.id, input.conversationId))
    .limit(1);

  const recipients = (await participantIds(input.conversationId)).filter(
    (id) => id !== input.senderId,
  );
  const isMention = conversation?.type === "department" && body.includes("@");
  if (input.notify !== false && (conversation?.type === "direct" || isMention)) {
    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, input.senderId))
      .limit(1);
    const title = isMention
      ? `Mention in ${conversation?.title ?? "department chat"}`
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
    .where(
      and(
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

export async function deleteChatMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  canModerate = false,
) {
  if (!(await requireParticipant(conversationId, userId))) {
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

export { requireParticipant };
