import { hasPermission, requireAdmin } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { mediaUrl } from "@/lib/media";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "@/components/layout/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const settings = await getSettings();

  return (
    <AdminShell
      name={user.name}
      avatarUrl={mediaUrl(user.profile.avatarKey)}
      logoUrl={settings.logo_key ? "/api/branding/logo" : null}
      unread={user.unreadNotifications}
      canManageMembers={hasPermission(user, PERMISSIONS.memberReview)}
      canManageAppointments={hasPermission(user, PERMISSIONS.appointmentManage)}
      canManageContent={hasPermission(user, PERMISSIONS.contentManage)}
      canManageSettings={hasPermission(user, PERMISSIONS.settingsManage)}
    >
      {children}
    </AdminShell>
  );
}
