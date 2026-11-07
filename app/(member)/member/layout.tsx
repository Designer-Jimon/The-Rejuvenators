import { isAdmin, requireUser } from "@/lib/auth/authorize";
import { mediaUrl } from "@/lib/media";
import { totalChatUnread } from "@/lib/chat";
import { MemberShell } from "@/components/layout/member-shell";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/member");
  const unreadChat = await totalChatUnread(user.id);

  return (
    <MemberShell
      name={user.name}
      avatarUrl={mediaUrl(user.profile.avatarKey)}
      memberCode={user.profile.memberCode}
      unread={user.unreadNotifications}
      unreadChat={unreadChat}
      canAccessAdmin={isAdmin(user)}
    >
      {children}
    </MemberShell>
  );
}
