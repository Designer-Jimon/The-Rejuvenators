import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/authorize";
import { getOrCreateDepartmentConversation, listChatContacts, listChatConversations } from "@/lib/chat";
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

  if (user.profile.requestedDepartmentId) {
    try {
      await getOrCreateDepartmentConversation(
        user.profile.requestedDepartmentId,
        user.id,
      );
    } catch {
      /* A department chat is optional; direct messages still work. */
    }
  }

  const [conversations, contacts] = await Promise.all([
    listChatConversations(user.id),
    listChatContacts(user.id),
  ]);

  return (
    <ChatWorkspace
      initialConversationId={c ?? null}
      initialConversations={conversations}
      contacts={contacts}
      currentUserId={user.id}
      currentUserName={user.name}
    />
  );
}
