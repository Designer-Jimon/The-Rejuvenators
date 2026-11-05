"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { contentBlocks, siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { websiteContentSchema } from "@/lib/admin/cms-validation";
import {
  CONTENT_SETTING_KEYS,
  EDITABLE_BLOCK_KEYS,
} from "@/lib/admin/cms-keys";
import { logAudit } from "@/lib/audit";

export async function saveWebsiteContent(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/content",
  );

  const settings: Record<string, string> = {};
  for (const key of CONTENT_SETTING_KEYS) {
    settings[key] = String(formData.get(key) ?? "");
  }

  const blocks = EDITABLE_BLOCK_KEYS.map((key) => ({
    key,
    title: String(formData.get(`title_${key}`) ?? ""),
    body: String(formData.get(`body_${key}`) ?? ""),
  }));

  const parsed = websiteContentSchema.safeParse({ ...settings, blocks });
  if (!parsed.success) {
    redirect(
      `/admin/content?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Please check the form.",
      )}`,
    );
  }

  const db = await getDb();
  const now = new Date();
  for (const key of CONTENT_SETTING_KEYS) {
    const value = parsed.data[key];
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: now, updatedBy: user.id })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: now, updatedBy: user.id },
      });
  }

  for (const block of parsed.data.blocks) {
    await db
      .insert(contentBlocks)
      .values({
        id: crypto.randomUUID(),
        key: block.key,
        title: block.title,
        body: block.body,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: contentBlocks.key,
        set: { title: block.title, body: block.body, updatedAt: now },
      });
  }

  await logAudit({
    actorId: user.id,
    action: "content.updated",
    entityType: "content",
    details: `Updated ${CONTENT_SETTING_KEYS.length} settings and ${blocks.length} content sections.`,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/content");
  redirect("/admin/content?saved=1");
}
