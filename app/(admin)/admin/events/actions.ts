"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventDepartments, events } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { NOTIFICATION_TYPES, PERMISSIONS } from "@/lib/constants";
import { eventSchema } from "@/lib/admin/cms-validation";
import { logAudit } from "@/lib/audit";
import { notifyMembers } from "@/lib/notifications";
import { slugify } from "@/lib/utils";

function done(message: string): never {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/member/events");
  revalidatePath("/admin/events");
  redirect(`/admin/events?saved=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  redirect(`/admin/events?error=${encodeURIComponent(message)}`);
}

function lagosDate(date: string, time: string) {
  return new Date(`${date}T${time}:00+01:00`);
}

export async function saveEvent(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/events");
  const parsed = eventSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? "Other"),
    imageKey: String(formData.get("imageKey") ?? ""),
    date: String(formData.get("date") ?? ""),
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
    departments: formData.getAll("departments").map((value) => String(value)),
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid event.");
  }

  const db = await getDb();
  const now = new Date();
  const startsAt = lagosDate(parsed.data.date, parsed.data.start);
  const endsAt = lagosDate(parsed.data.date, parsed.data.end);
  const values = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category,
    instructions: parsed.data.instructions || null,
    location: parsed.data.venue || null,
    startsAt,
    endsAt,
    coverKey: parsed.data.imageKey || null,
    isPublished: parsed.data.isPublished,
    updatedAt: now,
  };

  let eventId = parsed.data.id;
  let created = false;
  if (eventId) {
    await db.update(events).set(values).where(eq(events.id, eventId));
  } else {
    eventId = crypto.randomUUID();
    created = true;
    await db.insert(events).values({
      id: eventId,
      ...values,
      slug: `${slugify(parsed.data.title) || "event"}-${Date.now().toString(36)}`,
      createdAt: now,
    });
  }

  await db
    .delete(eventDepartments)
    .where(eq(eventDepartments.eventId, eventId));
  if (parsed.data.departments.length) {
    await db.insert(eventDepartments).values(
      parsed.data.departments.map((departmentId) => ({
        eventId: eventId,
        departmentId,
      })),
    );
  }

  if (created) {
    await notifyMembers({
      type: NOTIFICATION_TYPES.eventCreated,
      title: `New event: ${parsed.data.title}`,
      body: `${parsed.data.category} on ${parsed.data.date} at ${
        parsed.data.start
      }${parsed.data.venue ? ` · ${parsed.data.venue}` : ""}.`,
      link: "/member/events",
    });
  }

  await logAudit({
    actorId: user.id,
    action: created ? "event.created" : "event.updated",
    entityType: "event",
    entityId: eventId,
    details: `${created ? "Created" : "Updated"} event ${parsed.data.title}.`,
  });

  done(created ? "Event created." : "Event updated.");
}

export async function deleteEvent(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/events");
  const id = String(formData.get("id") ?? "");
  if (!id) fail("Event not found.");
  const db = await getDb();
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  const event = rows[0];
  if (!event) fail("Event not found.");
  await db.delete(events).where(eq(events.id, event.id));
  await logAudit({
    actorId: user.id,
    action: "event.deleted",
    entityType: "event",
    entityId: event.id,
    details: `Deleted event ${event.title}.`,
  });
  done("Event deleted.");
}
