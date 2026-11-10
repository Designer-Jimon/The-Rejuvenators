"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { memberProfiles, worshipCenters } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { worshipCenterSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import {
  archiveCenterConversations,
  ensureCenterGroups,
} from "@/lib/chat";

function parseCenter(formData: FormData) {
  return worshipCenterSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    country: String(formData.get("country") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    mapUrl: String(formData.get("mapUrl") ?? ""),
    photoKey: String(formData.get("photoKey") ?? ""),
    serviceTimes: String(formData.get("serviceTimes") ?? ""),
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "on",
  });
}

function fail(message: string): never {
  redirect(
    `/admin/worship-centers?error=${encodeURIComponent(message)}`,
  );
}

function done(message: "saved" | "created" | "deleted"): never {
  revalidatePath("/", "layout");
  revalidatePath("/admin/worship-centers");
  revalidatePath("/worship-centers");
  revalidatePath("/register");
  redirect(`/admin/worship-centers?${message}=1`);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const db = await getDb();
  const slug = slugify(base);
  if (!slug) return "";
  const conflict = await db
    .select({ id: worshipCenters.id })
    .from(worshipCenters)
    .where(
      excludeId
        ? and(eq(worshipCenters.slug, slug), ne(worshipCenters.id, excludeId))
        : eq(worshipCenters.slug, slug),
    )
    .limit(1);
  return conflict[0] ? "" : slug;
}

export async function saveWorshipCenter(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.settingsManage,
    "/admin/worship-centers",
  );
  const parsed = parseCenter(formData);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid worship center.");
  }

  const db = await getDb();
  const id = parsed.data.id;

  if (id) {
    const rows = await db
      .select()
      .from(worshipCenters)
      .where(eq(worshipCenters.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) fail("Worship center not found.");

    const slug = await uniqueSlug(parsed.data.slug || parsed.data.name, id);
    if (!slug) fail("Another worship center already uses this link.");

    await db
      .update(worshipCenters)
      .set({
        name: parsed.data.name,
        slug,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        mapUrl: parsed.data.mapUrl || null,
        photoKey: parsed.data.photoKey || null,
        serviceTimes: parsed.data.serviceTimes || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(worshipCenters.id, id));

    await logAudit({
      actorId: user.id,
      action: "worship_center.updated",
      entityType: "worship_center",
      entityId: id,
      details: `Updated worship center ${parsed.data.name}.`,
    });

    if (parsed.data.isActive) {
      await ensureCenterGroups(id);
    } else {
      await archiveCenterConversations(id);
    }

    done("saved");
  }

  const slug = await uniqueSlug(parsed.data.slug || parsed.data.name);
  if (!slug) fail("Another worship center already uses this link.");

  const newId = crypto.randomUUID();
  await db.insert(worshipCenters).values({
    id: newId,
    name: parsed.data.name,
    slug,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    country: parsed.data.country || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    mapUrl: parsed.data.mapUrl || null,
    photoKey: parsed.data.photoKey || null,
    serviceTimes: parsed.data.serviceTimes || null,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  await logAudit({
    actorId: user.id,
    action: "worship_center.created",
    entityType: "worship_center",
    entityId: newId,
    details: `Created worship center ${parsed.data.name}.`,
  });
  if (parsed.data.isActive) {
    await ensureCenterGroups(newId);
  }
  done("created");
}

export async function deleteWorshipCenter(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.settingsManage,
    "/admin/worship-centers",
  );
  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Worship center not found.");

  const db = await getDb();
  const rows = await db
    .select()
    .from(worshipCenters)
    .where(eq(worshipCenters.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) fail("Worship center not found.");

  const members = await db
    .select({ id: memberProfiles.userId })
    .from(memberProfiles)
    .where(eq(memberProfiles.worshipCenterId, id))
    .limit(1);
  if (members[0]) {
    fail(
      "This center still has members. Move them to another center before deleting.",
    );
  }

  await archiveCenterConversations(id);
  await db.delete(worshipCenters).where(eq(worshipCenters.id, id));
  await logAudit({
    actorId: user.id,
    action: "worship_center.deleted",
    entityType: "worship_center",
    entityId: id,
    details: `Deleted worship center ${row.name}.`,
  });
  done("deleted");
}
