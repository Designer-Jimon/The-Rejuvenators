"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { socialSettingsSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

const FIELDS = [
  "phone",
  "email",
  "address",
  "map_url",
  "whatsapp_group_url",
  "facebook_url",
  "instagram_url",
  "youtube_url",
] as const;

export async function saveSocialSettings(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.settingsManage,
    "/admin/social",
  );
  const payload: Record<string, string> = {};
  for (const field of FIELDS) {
    payload[field] = String(formData.get(field) ?? "");
  }

  const parsed = socialSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(
      `/admin/social?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Please check the form.",
      )}`,
    );
  }

  const db = await getDb();
  const now = new Date();
  for (const field of FIELDS) {
    const value = parsed.data[field];
    await db
      .insert(siteSettings)
      .values({ key: field, value, updatedAt: now, updatedBy: user.id })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: now, updatedBy: user.id },
      });
  }

  await logAudit({
    actorId: user.id,
    action: "settings.social_updated",
    entityType: "site_settings",
    details: "Updated contact and social links.",
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/social");
  redirect("/admin/social?saved=1");
}
