"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS, SETTING_FIELDS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import {
  ANNOUNCEMENT_ENABLED_KEY,
  ANNOUNCEMENT_REPLIES_KEY,
  syncAllCentersConversation,
} from "@/lib/chat";

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

  const toggles: Array<[string, string]> = [
    [ANNOUNCEMENT_ENABLED_KEY, "announcementGroupEnabled"],
    [ANNOUNCEMENT_REPLIES_KEY, "announcementAllowReplies"],
  ];
  for (const [key, fieldName] of toggles) {
    const value = formData.get(fieldName) === "on" ? "1" : "0";
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: now, updatedBy: user.id })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: now, updatedBy: user.id },
      });
    changes.push(key);
  }
  await syncAllCentersConversation();

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
