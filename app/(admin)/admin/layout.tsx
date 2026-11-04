import { hasPermission, requireAdmin } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { mediaUrl } from "@/lib/media";
import { AdminShell } from "@/components/layout/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell
      name={user.name}
      avatarUrl={mediaUrl(user.profile.avatarKey)}
      unread={user.unreadNotifications}
      canManageMembers={hasPermission(user, PERMISSIONS.memberReview)}
      canManageSettings={hasPermission(user, PERMISSIONS.settingsManage)}
    >
      {children}
    </AdminShell>
  );
}
