"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { activitySchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

const idSchema = z.string().trim().min(1);

function done(message: string): never {
  revalidatePath("/", "layout");
  revalidatePath("/admin/activities");
  redirect(`/admin/activities?saved=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  redirect(`/admin/activities?error=${encodeURIComponent(message)}`);
}

function readActivity(formData: FormData) {
  return activitySchema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    day: String(formData.get("day") ?? ""),
    time: String(formData.get("time") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    imageKey: String(formData.get("imageKey") ?? ""),
    extraInfo: String(formData.get("extraInfo") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isPublished: formData.get("isPublished") === "on",
  });
}

export async function saveActivity(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/activities",
  );
  const parsed = readActivity(formData);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid activity.");
  }
  const db = await getDb();
  const now = new Date();
  const values = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    day: parsed.data.day || null,
    time: parsed.data.time || null,
    venue: parsed.data.venue || null,
    location: parsed.data.venue || null,
    imageKey: parsed.data.imageKey || null,
    extraInfo: parsed.data.extraInfo || null,
    sortOrder: parsed.data.sortOrder,
    isPublished: parsed.data.isPublished,
    updatedAt: now,
  };

  if (parsed.data.id) {
    await db
      .update(activities)
      .set(values)
      .where(eq(activities.id, parsed.data.id));
    await logAudit({
      actorId: user.id,
      action: "activity.updated",
      entityType: "activity",
      entityId: parsed.data.id,
      details: `Updated activity ${parsed.data.title}.`,
    });
  } else {
    const id = crypto.randomUUID();
    await db.insert(activities).values({
      id,
      ...values,
      createdAt: now,
    });
    await logAudit({
      actorId: user.id,
      action: "activity.created",
      entityType: "activity",
      entityId: id,
      details: `Created activity ${parsed.data.title}.`,
    });
  }
  done("Activity saved.");
}

export async function toggleActivity(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/activities",
  );
  const id = idSchema.safeParse(formData.get("id"));
  const isPublished = formData.get("isPublished") === "true";
  if (!id.success) fail("Activity not found.");
  const db = await getDb();
  await db
    .update(activities)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(activities.id, id.data));
  await logAudit({
    actorId: user.id,
    action: "activity.toggled",
    entityType: "activity",
    entityId: id.data,
    details: isPublished ? "Activated activity." : "Deactivated activity.",
  });
  done(isPublished ? "Activity activated." : "Activity deactivated.");
}

export async function moveActivity(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/activities",
  );
  const id = idSchema.safeParse(formData.get("id"));
  const direction = z.enum(["up", "down"]).safeParse(formData.get("direction"));
  if (!id.success || !direction.success) fail("Activity not found.");

  const db = await getDb();
  const list = await db
    .select()
    .from(activities)
    .orderBy(asc(activities.sortOrder), asc(activities.createdAt));
  const index = list.findIndex((row) => row.id === id.data);
  const current = list[index];
  const target = list[direction.data === "up" ? index - 1 : index + 1];
  if (!current || !target) fail("Activity cannot move further.");

  await db
    .update(activities)
    .set({ sortOrder: target.sortOrder })
    .where(eq(activities.id, current.id));
  await db
    .update(activities)
    .set({ sortOrder: current.sortOrder })
    .where(eq(activities.id, target.id));
  await logAudit({
    actorId: user.id,
    action: "activity.reordered",
    entityType: "activity",
    entityId: current.id,
    details: `Moved activity ${direction.data}.`,
  });
  done("Activity order saved.");
}

export async function deleteActivity(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/activities",
  );
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) fail("Activity not found.");
  const db = await getDb();
  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id.data))
    .limit(1);
  const row = rows[0];
  if (!row) fail("Activity not found.");
  await db.delete(activities).where(eq(activities.id, row.id));
  await logAudit({
    actorId: user.id,
    action: "activity.deleted",
    entityType: "activity",
    entityId: row.id,
    details: `Deleted activity ${row.title}.`,
  });
  done("Activity deleted.");
}
