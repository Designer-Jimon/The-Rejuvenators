"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { departmentSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import {
  archiveDepartmentConversations,
  ensureDepartmentGroups,
} from "@/lib/chat";

function parseDepartment(formData: FormData) {
  return departmentSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    iconKey: String(formData.get("iconKey") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageKey: String(formData.get("imageKey") ?? ""),
    activities: String(formData.get("activities") ?? ""),
    headOfUnit: String(formData.get("headOfUnit") ?? ""),
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "on",
  });
}

function fail(message: string): never {
  redirect(`/admin/departments?error=${encodeURIComponent(message)}`);
}

function done(message: "saved" | "created" | "deleted"): never {
  revalidatePath("/", "layout");
  revalidatePath("/admin/departments");
  revalidatePath("/departments");
  redirect(`/admin/departments?${message}=1`);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const db = await getDb();
  const slug = slugify(base);
  if (!slug) return "";
  const conflict = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      excludeId
        ? and(eq(departments.slug, slug), ne(departments.id, excludeId))
        : eq(departments.slug, slug),
    )
    .limit(1);
  return conflict[0] ? "" : slug;
}

export async function saveDepartment(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/departments",
  );
  const parsed = parseDepartment(formData);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid department.");
  }
  if (!parsed.data.id) fail("Department not found.");

  const db = await getDb();
  const rows = await db
    .select()
    .from(departments)
    .where(eq(departments.id, parsed.data.id))
    .limit(1);
  const row = rows[0];
  if (!row) fail("Department not found.");

  const slug = await uniqueSlug(parsed.data.slug || parsed.data.name, row.id);
  if (!slug) fail("Another department already uses this link.");
  if (parsed.data.isActive === false && row.isActive) {
    const active = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.isActive, true));
    if (active.length <= 1) fail("Keep at least one department active.");
  }

  await db
    .update(departments)
    .set({
      name: parsed.data.name,
      slug,
      iconKey: parsed.data.iconKey || null,
      description: parsed.data.description || null,
      imageKey: parsed.data.imageKey || null,
      activities: parsed.data.activities || null,
      headOfUnit: parsed.data.headOfUnit || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, row.id));

  if (parsed.data.isActive) {
    await ensureDepartmentGroups(row.id);
  } else {
    await archiveDepartmentConversations(row.id);
  }

  await logAudit({
    actorId: user.id,
    action: "department.updated",
    entityType: "department",
    entityId: row.id,
    details: `Updated department ${parsed.data.name}.`,
  });

  done("saved");
}

export async function createDepartment(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/departments",
  );
  const parsed = parseDepartment(formData);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid department.");
  }

  const slug = await uniqueSlug(parsed.data.slug || parsed.data.name);
  if (!slug) fail("Another department already uses this link.");

  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(departments).values({
    id,
    name: parsed.data.name,
    slug,
    iconKey: parsed.data.iconKey || null,
    description: parsed.data.description || null,
    imageKey: parsed.data.imageKey || null,
    activities: parsed.data.activities || null,
    headOfUnit: parsed.data.headOfUnit || null,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  if (parsed.data.isActive) {
    await ensureDepartmentGroups(id);
  }

  await logAudit({
    actorId: user.id,
    action: "department.created",
    entityType: "department",
    entityId: id,
    details: `Created department ${parsed.data.name}.`,
  });

  done("created");
}

export async function deleteDepartment(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/departments",
  );
  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Department not found.");

  const db = await getDb();
  const rows = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) fail("Department not found.");

  await db.delete(departments).where(eq(departments.id, id));
  await logAudit({
    actorId: user.id,
    action: "department.deleted",
    entityType: "department",
    entityId: id,
    details: `Deleted department ${row.name}.`,
  });

  done("deleted");
}
