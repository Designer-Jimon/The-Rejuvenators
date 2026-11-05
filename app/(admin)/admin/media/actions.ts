"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { mediaMetaSchema } from "@/lib/admin/cms-validation";
import { deleteMediaObject } from "@/lib/media";
import { logAudit } from "@/lib/audit";

const idSchema = z.string().trim().min(1);

function done(path: string, message: string): never {
  revalidatePath("/", "layout");
  revalidatePath(path);
  redirect(`${path}?saved=${encodeURIComponent(message)}`);
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function updateMediaAlt(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/media");
  const id = idSchema.safeParse(formData.get("id"));
  const meta = mediaMetaSchema.safeParse({
    altText: String(formData.get("altText") ?? ""),
  });
  if (!id.success) fail("/admin/media", "Image not found.");
  if (!meta.success) fail("/admin/media", meta.error.issues[0]?.message ?? "Invalid alt text.");

  const db = await getDb();
  await db
    .update(mediaLibrary)
    .set({ altText: meta.data.altText || null })
    .where(eq(mediaLibrary.id, id.data));
  await logAudit({
    actorId: user.id,
    action: "media.alt_updated",
    entityType: "media",
    entityId: id.data,
    details: "Updated image alt text.",
  });
  done("/admin/media", "Alt text saved.");
}

export async function deleteMedia(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/media");
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) fail("/admin/media", "Image not found.");

  const db = await getDb();
  const rows = await db
    .select()
    .from(mediaLibrary)
    .where(eq(mediaLibrary.id, id.data))
    .limit(1);
  const row = rows[0];
  if (!row) fail("/admin/media", "Image not found.");

  await deleteMediaObject(row.key);
  await db.delete(mediaLibrary).where(eq(mediaLibrary.id, row.id));
  await logAudit({
    actorId: user.id,
    action: "media.deleted",
    entityType: "media",
    entityId: row.id,
    details: `Deleted ${row.filename}.`,
  });
  done("/admin/media", "Image deleted.");
}
