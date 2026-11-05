"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { slideshowImages } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { slideshowSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

const idSchema = z.string().trim().min(1);

function done(message: string): never {
  revalidatePath("/", "layout");
  revalidatePath("/admin/slideshow");
  redirect(`/admin/slideshow?saved=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  redirect(`/admin/slideshow?error=${encodeURIComponent(message)}`);
}

function readSlide(formData: FormData) {
  return slideshowSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    imageKey: String(formData.get("imageKey") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    subheadline: String(formData.get("subheadline") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") === "on",
  });
}

export async function saveSlide(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/slideshow",
  );
  const parsed = readSlide(formData);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid slide.");
  }
  const db = await getDb();
  const now = new Date();
  if (parsed.data.id) {
    await db
      .update(slideshowImages)
      .set({
        imageKey: parsed.data.imageKey,
        headline: parsed.data.headline || null,
        subheadline: parsed.data.subheadline || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
      })
      .where(eq(slideshowImages.id, parsed.data.id));
    await logAudit({
      actorId: user.id,
      action: "slideshow.updated",
      entityType: "slideshow",
      entityId: parsed.data.id,
      details: `Updated slide ${parsed.data.headline || parsed.data.imageKey}.`,
    });
  } else {
    const id = crypto.randomUUID();
    await db.insert(slideshowImages).values({
      id,
      imageKey: parsed.data.imageKey,
      headline: parsed.data.headline || null,
      subheadline: parsed.data.subheadline || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      createdAt: now,
    });
    await logAudit({
      actorId: user.id,
      action: "slideshow.created",
      entityType: "slideshow",
      entityId: id,
      details: `Created slide ${parsed.data.headline || parsed.data.imageKey}.`,
    });
  }
  done("Slide saved.");
}

export async function toggleSlide(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/slideshow",
  );
  const id = idSchema.safeParse(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  if (!id.success) fail("Slide not found.");
  const db = await getDb();
  await db
    .update(slideshowImages)
    .set({ isActive })
    .where(eq(slideshowImages.id, id.data));
  await logAudit({
    actorId: user.id,
    action: "slideshow.toggled",
    entityType: "slideshow",
    entityId: id.data,
    details: isActive ? "Activated slide." : "Deactivated slide.",
  });
  done(isActive ? "Slide activated." : "Slide deactivated.");
}

export async function moveSlide(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/slideshow",
  );
  const id = idSchema.safeParse(formData.get("id"));
  const direction = z.enum(["up", "down"]).safeParse(formData.get("direction"));
  if (!id.success || !direction.success) fail("Slide not found.");

  const db = await getDb();
  const list = await db
    .select()
    .from(slideshowImages)
    .orderBy(asc(slideshowImages.sortOrder), asc(slideshowImages.createdAt));
  const index = list.findIndex((row) => row.id === id.data);
  if (index < 0) fail("Slide not found.");
  const targetIndex = direction.data === "up" ? index - 1 : index + 1;
  const target = list[targetIndex];
  const current = list[index];
  if (!target || !current) fail("Slide cannot move further.");

  await db
    .update(slideshowImages)
    .set({ sortOrder: target.sortOrder })
    .where(eq(slideshowImages.id, current.id));
  await db
    .update(slideshowImages)
    .set({ sortOrder: current.sortOrder })
    .where(eq(slideshowImages.id, target.id));

  await logAudit({
    actorId: user.id,
    action: "slideshow.reordered",
    entityType: "slideshow",
    entityId: current.id,
    details: `Moved slide ${direction.data}.`,
  });
  done("Slide order saved.");
}

export async function deleteSlide(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/slideshow",
  );
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) fail("Slide not found.");
  const db = await getDb();
  const rows = await db
    .select()
    .from(slideshowImages)
    .where(eq(slideshowImages.id, id.data))
    .limit(1);
  const row = rows[0];
  if (!row) fail("Slide not found.");
  await db.delete(slideshowImages).where(eq(slideshowImages.id, row.id));
  await logAudit({
    actorId: user.id,
    action: "slideshow.deleted",
    entityType: "slideshow",
    entityId: row.id,
    details: `Deleted slide ${row.headline || row.imageKey}.`,
  });
  done("Slide deleted.");
}
