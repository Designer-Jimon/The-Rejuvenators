import { isAdmin, requireUser } from "@/lib/auth/authorize";
import { mediaUrl } from "@/lib/media";
import { totalChatUnread } from "@/lib/chat";
import { getSettings, getLogoUrl } from "@/lib/settings";
import { CHURCH_NAME } from "@/lib/branding";
import { MemberShell } from "@/components/layout/member-shell";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/member");
  const [unreadChat, settings, logoUrl] = await Promise.all([
    totalChatUnread(user.id),
    getSettings(),
    getLogoUrl(),
  ]);

  return (
    <MemberShell
      name={user.name}
      avatarUrl={mediaUrl(user.profile.avatarKey)}
      memberCode={user.profile.memberCode}
      churchName={settings.church_name?.trim() || CHURCH_NAME}
      logoUrl={logoUrl}
      unread={user.unreadNotifications}
      unreadChat={unreadChat}
      canAccessAdmin={isAdmin(user)}
    >
      {children}
    </MemberShell>
  );
}
