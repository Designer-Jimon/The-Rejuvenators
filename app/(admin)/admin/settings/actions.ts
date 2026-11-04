"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS, SETTING_FIELDS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

const urlFields = new Set([
  "whatsapp_group_url",
  "facebook_url",
  "instagram_url",
  "youtube_url",
]);

export async function updateSettings(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.settingsManage,
    "/admin/settings",
  );
  const db = await getDb();
  const now = new Date();
  const changes: string[] = [];

  for (const field of SETTING_FIELDS) {
    const raw = formData.get(field.key);
    if (typeof raw !== "string") continue;
    const value = raw.trim().slice(0, field.multiline ? 4000 : 500);

    if (urlFields.has(field.key) && value) {
      if (!/^https:\/\/.+/i.test(value)) {
        redirect("/admin/settings?error=url");
      }
    }

    await db
      .insert(siteSettings)
      .values({
        key: field.key,
        value,
        updatedAt: now,
        updatedBy: user.id,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: now, updatedBy: user.id },
      });
    changes.push(field.key);
  }

  await logAudit({
    actorId: user.id,
    action: "settings.updated",
    entityType: "settings",
    details: `Updated ${changes.length} site settings.`,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
