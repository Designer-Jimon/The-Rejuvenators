import { hasPermission, requireAdmin } from "@/lib/auth/authorize";
import { PERMISSIONS, ROLES } from "@/lib/constants";
import { mediaUrl } from "@/lib/media";
import { getSettings, getLogoUrl } from "@/lib/settings";
import { CHURCH_NAME } from "@/lib/branding";
import { AdminShell } from "@/components/layout/admin-shell";
import { totalChatUnread } from "@/lib/chat";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const [settings, unreadChat, logoUrl] = await Promise.all([
    getSettings(),
    totalChatUnread(user.id),
    getLogoUrl(),
  ]);

  return (
    <AdminShell
      name={user.name}
      avatarUrl={mediaUrl(user.profile.avatarKey)}
      churchName={settings.church_name?.trim() || CHURCH_NAME}
      logoUrl={logoUrl}
      unread={user.unreadNotifications}
      unreadChat={unreadChat}
      canManageMembers={hasPermission(user, PERMISSIONS.memberReview)}
      canManageAppointments={hasPermission(user, PERMISSIONS.appointmentManage)}
      canManageContent={hasPermission(user, PERMISSIONS.contentManage)}
      canManageSettings={hasPermission(user, PERMISSIONS.settingsManage)}
      canManageAi={user.roles.includes(ROLES.superAdmin)}
    >
      {children}
    </AdminShell>
  );
}
