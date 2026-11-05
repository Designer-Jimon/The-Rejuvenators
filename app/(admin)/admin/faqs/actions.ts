"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { faqSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";

const idSchema = z.string().trim().min(1);

function done(message: string): never {
  revalidatePath("/", "layout");
  revalidatePath("/admin/faqs");
  redirect(`/admin/faqs?saved=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  redirect(`/admin/faqs?error=${encodeURIComponent(message)}`);
}

export async function saveFaq(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/faqs",
  );
  const parsed = faqSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid FAQ.");
  }

  const db = await getDb();
  const now = new Date();
  if (parsed.data.id) {
    await db
      .update(faqs)
      .set({
        question: parsed.data.question,
        answer: parsed.data.answer,
        sortOrder: parsed.data.sortOrder,
        isPublished: parsed.data.isPublished,
      })
      .where(eq(faqs.id, parsed.data.id));
    await logAudit({
      actorId: user.id,
      action: "faq.updated",
      entityType: "faq",
      entityId: parsed.data.id,
      details: `Updated FAQ ${parsed.data.question}.`,
    });
  } else {
    const id = crypto.randomUUID();
    await db.insert(faqs).values({
      id,
      question: parsed.data.question,
      answer: parsed.data.answer,
      sortOrder: parsed.data.sortOrder,
      isPublished: parsed.data.isPublished,
      createdAt: now,
    });
    await logAudit({
      actorId: user.id,
      action: "faq.created",
      entityType: "faq",
      entityId: id,
      details: `Created FAQ ${parsed.data.question}.`,
    });
  }
  done("FAQ saved.");
}

export async function toggleFaq(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/faqs",
  );
  const id = idSchema.safeParse(formData.get("id"));
  const isPublished = formData.get("isPublished") === "true";
  if (!id.success) fail("FAQ not found.");
  const db = await getDb();
  await db
    .update(faqs)
    .set({ isPublished })
    .where(eq(faqs.id, id.data));
  await logAudit({
    actorId: user.id,
    action: "faq.toggled",
    entityType: "faq",
    entityId: id.data,
    details: isPublished ? "Activated FAQ." : "Deactivated FAQ.",
  });
  done(isPublished ? "FAQ activated." : "FAQ deactivated.");
}

export async function moveFaq(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/faqs",
  );
  const id = idSchema.safeParse(formData.get("id"));
  const direction = z.enum(["up", "down"]).safeParse(formData.get("direction"));
  if (!id.success || !direction.success) fail("FAQ not found.");

  const db = await getDb();
  const list = await db
    .select()
    .from(faqs)
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  const index = list.findIndex((row) => row.id === id.data);
  const current = list[index];
  const target = list[direction.data === "up" ? index - 1 : index + 1];
  if (!current || !target) fail("FAQ cannot move further.");

  await db
    .update(faqs)
    .set({ sortOrder: target.sortOrder })
    .where(eq(faqs.id, current.id));
  await db
    .update(faqs)
    .set({ sortOrder: current.sortOrder })
    .where(eq(faqs.id, target.id));
  await logAudit({
    actorId: user.id,
    action: "faq.reordered",
    entityType: "faq",
    entityId: current.id,
    details: `Moved FAQ ${direction.data}.`,
  });
  done("FAQ order saved.");
}

export async function deleteFaq(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/faqs",
  );
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) fail("FAQ not found.");
  const db = await getDb();
  const rows = await db
    .select()
    .from(faqs)
    .where(eq(faqs.id, id.data))
    .limit(1);
  const row = rows[0];
  if (!row) fail("FAQ not found.");
  await db.delete(faqs).where(eq(faqs.id, row.id));
  await logAudit({
    actorId: user.id,
    action: "faq.deleted",
    entityType: "faq",
    entityId: row.id,
    details: `Deleted FAQ ${row.question}.`,
  });
  done("FAQ deleted.");
}
