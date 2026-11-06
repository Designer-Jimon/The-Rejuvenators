"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  eventCenters,
  eventDepartments,
  eventLiveLinks,
  events,
  eventSessions,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { NOTIFICATION_TYPES, PERMISSIONS } from "@/lib/constants";
import {
  eventLiveLinkInput,
  eventSchema,
  eventSessionInput,
} from "@/lib/admin/cms-validation";
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

function collectSessions(formData: FormData) {
  const titles = formData.getAll("sessionTitle").map((value) => String(value));
  const dates = formData.getAll("sessionDate").map((value) => String(value));
  const starts = formData.getAll("sessionStart").map((value) => String(value));
  const ends = formData.getAll("sessionEnd").map((value) => String(value));

  return titles
    .map((title, index) => ({
      title: title.trim(),
      date: (dates[index] ?? "").trim(),
      start: (starts[index] ?? "").trim(),
      end: (ends[index] ?? "").trim(),
    }))
    .filter(
      (session) =>
        session.title || session.date || session.start || session.end,
    );
}

function collectLiveLinks(formData: FormData) {
  const labels = formData.getAll("liveLabel").map((value) => String(value));
  const urls = formData.getAll("liveUrl").map((value) => String(value));

  return labels
    .map((label, index) => ({
      label: label.trim(),
      url: (urls[index] ?? "").trim(),
    }))
    .filter((link) => link.label || link.url);
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
    centers: formData.getAll("centers").map((value) => String(value)),
    durationDays: formData.get("durationDays") ?? 1,
    showOnHomePopup: formData.get("showOnHomePopup") === "on",
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Invalid event.");
  }

  const sessions = z
    .array(eventSessionInput)
    .safeParse(collectSessions(formData));
  if (!sessions.success) {
    fail(sessions.error.issues[0]?.message ?? "Check the event sessions.");
  }

  const liveLinks = z
    .array(eventLiveLinkInput)
    .safeParse(collectLiveLinks(formData));
  if (!liveLinks.success) {
    fail(liveLinks.error.issues[0]?.message ?? "Check the live stream links.");
  }

  const db = await getDb();
  const now = new Date();
  const startsAt = lagosDate(parsed.data.date, parsed.data.start);
  const endsAt = new Date(
    lagosDate(parsed.data.date, parsed.data.end).getTime() +
      (parsed.data.durationDays - 1) * 86_400_000,
  );
  const values = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category,
    instructions: parsed.data.instructions || null,
    location: parsed.data.venue || null,
    startsAt,
    endsAt,
    durationDays: parsed.data.durationDays,
    showOnHomePopup: parsed.data.showOnHomePopup,
    coverKey: parsed.data.imageKey || null,
    isPublished: parsed.data.isPublished,
    updatedAt: now,
  };

  let eventId = parsed.data.id;
  let created = false;
  if (eventId) {
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!existing[0]) fail("Event not found.");
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

  await db.delete(eventCenters).where(eq(eventCenters.eventId, eventId));
  if (parsed.data.centers.length) {
    await db.insert(eventCenters).values(
      parsed.data.centers.map((centerId) => ({ eventId, centerId })),
    );
  }

  await db.delete(eventSessions).where(eq(eventSessions.eventId, eventId));
  if (sessions.data.length) {
    await db.insert(eventSessions).values(
      sessions.data.map((session, index) => ({
        id: crypto.randomUUID(),
        eventId,
        title: session.title,
        startsAt: lagosDate(session.date, session.start),
        endsAt: lagosDate(session.date, session.end),
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  await db
    .delete(eventLiveLinks)
    .where(eq(eventLiveLinks.eventId, eventId));
  if (liveLinks.data.length) {
    await db.insert(eventLiveLinks).values(
      liveLinks.data.map((link, index) => ({
        id: crypto.randomUUID(),
        eventId,
        label: link.label,
        url: link.url,
        isActive: true,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  if (created) {
    const dayLabel =
      parsed.data.durationDays > 1
        ? `${parsed.data.date} (${parsed.data.durationDays} days), ${parsed.data.start}`
        : `${parsed.data.date} at ${parsed.data.start}`;
    await notifyMembers({
      type: NOTIFICATION_TYPES.eventCreated,
      title: `New event: ${parsed.data.title}`,
      body: `${parsed.data.category} on ${dayLabel}${
        parsed.data.venue ? ` · ${parsed.data.venue}` : ""
      }.`,
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
