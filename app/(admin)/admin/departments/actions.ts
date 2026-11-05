"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { departmentSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

export async function saveDepartment(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/departments",
  );
  const parsed = departmentSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageKey: String(formData.get("imageKey") ?? ""),
    activities: String(formData.get("activities") ?? ""),
    headOfUnit: String(formData.get("headOfUnit") ?? ""),
  });
  if (!parsed.success) {
    redirect(
      `/admin/departments?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid department.",
      )}`,
    );
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(departments)
    .where(eq(departments.id, parsed.data.id))
    .limit(1);
  const row = rows[0];
  if (!row) {
    redirect("/admin/departments?error=Department%20not%20found.");
  }

  await db
    .update(departments)
    .set({
      description: parsed.data.description || null,
      imageKey: parsed.data.imageKey || null,
      activities: parsed.data.activities || null,
      headOfUnit: parsed.data.headOfUnit || null,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, row.id));

  await logAudit({
    actorId: user.id,
    action: "department.updated",
    entityType: "department",
    entityId: row.id,
    details: `Updated department ${row.name}.`,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/departments");
  redirect("/admin/departments?saved=1");
}
