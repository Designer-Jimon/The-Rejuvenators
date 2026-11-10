import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departmentLeaders } from "@/lib/db/schema";
import { hasPermission, requireUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import {
  ANNOUNCEMENT_REPLIES_KEY,
  listChatContacts,
  listChatConversations,
  syncUserChatGroups,
} from "@/lib/chat";
import { ChatWorkspace } from "@/components/member/chat-workspace";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await requireUser("/member/chat");
  const { c } = await searchParams;

  try {
    await syncUserChatGroups(user.id);
  } catch {
    /* Group chats are optional; direct messages still work. */
  }

  const db = await getDb();
  const [conversations, contacts, settings, leadership] = await Promise.all([
    listChatConversations(user.id),
    listChatContacts(user.id),
    getSettings(),
    db
      .select({ id: departmentLeaders.id })
      .from(departmentLeaders)
      .where(
        and(
          eq(departmentLeaders.userId, user.id),
          isNull(departmentLeaders.endedAt),
        ),
      )
      .limit(1),
  ]);

  return (
    <ChatWorkspace
      initialConversationId={c ?? null}
      initialConversations={conversations}
      contacts={contacts}
      currentUserId={user.id}
      currentUserName={user.name}
      announcementReplies={settings[ANNOUNCEMENT_REPLIES_KEY] === "1"}
      canPostAnnouncements={
        hasPermission(user, PERMISSIONS.memberManage) || leadership.length > 0
      }
    />
  );
}
