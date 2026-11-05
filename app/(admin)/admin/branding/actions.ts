"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { brandingSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

export async function saveBranding(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/branding",
  );
  const parsed = brandingSchema.safeParse({
    logoKey: String(formData.get("logoKey") ?? ""),
  });
  if (!parsed.success) {
    redirect(
      `/admin/branding?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid logo.",
      )}`,
    );
  }

  const db = await getDb();
  const now = new Date();
  await db
    .insert(siteSettings)
    .values({
      key: "logo_key",
      value: parsed.data.logoKey,
      updatedAt: now,
      updatedBy: user.id,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: parsed.data.logoKey, updatedAt: now, updatedBy: user.id },
    });

  await logAudit({
    actorId: user.id,
    action: "branding.updated",
    entityType: "settings",
    entityId: "logo_key",
    details: parsed.data.logoKey
      ? "Updated the church logo."
      : "Removed the church logo.",
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/branding");
  redirect("/admin/branding?saved=1");
}
