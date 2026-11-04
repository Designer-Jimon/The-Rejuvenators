import { requireUser } from "@/lib/auth/authorize";
import { mediaUrl } from "@/lib/media";
import { MemberShell } from "@/components/layout/member-shell";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/member");

  return (
    <MemberShell
      name={user.name}
      avatarUrl={mediaUrl(user.profile.avatarKey)}
      memberCode={user.profile.memberCode}
      unread={user.unreadNotifications}
    >
      {children}
    </MemberShell>
  );
}
