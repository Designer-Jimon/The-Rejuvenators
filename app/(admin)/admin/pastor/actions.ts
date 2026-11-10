"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { pastorProfileSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

const keys = [
  "pastor_name",
  "pastor_title",
  "pastor_bio",
  "pastor_about",
  "pastor_quote",
  "pastor_photo_key",
] as const;

export async function savePastorProfile(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/pastor",
  );
  const parsed = pastorProfileSchema.safeParse({
    pastor_name: String(formData.get("pastor_name") ?? ""),
    pastor_title: String(formData.get("pastor_title") ?? ""),
    pastor_bio: String(formData.get("pastor_bio") ?? ""),
    pastor_about: String(formData.get("pastor_about") ?? ""),
    pastor_quote: String(formData.get("pastor_quote") ?? ""),
    pastor_photo_key: String(formData.get("pastor_photo_key") ?? ""),
  });
  if (!parsed.success) {
    redirect(
      `/admin/pastor?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Please check the form.",
      )}`,
    );
  }

  const db = await getDb();
  const now = new Date();
  for (const key of keys) {
    const value = parsed.data[key];
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: now, updatedBy: user.id })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: now, updatedBy: user.id },
      });
  }

  await logAudit({
    actorId: user.id,
    action: "pastor.updated",
    entityType: "settings",
    details: "Updated the pastor profile.",
  });

  revalidatePath("/", "layout");
  revalidatePath("/about");
  revalidatePath("/admin/pastor");
  redirect("/admin/pastor?saved=1");
}
