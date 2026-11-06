"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  attendanceAudit,
  attendanceRecords,
  attendanceSubmissions,
  departmentLeaders,
  departmentMembers,
  eventDepartments,
  events,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { NOTIFICATION_TYPES, PERMISSIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { notifyPermission } from "@/lib/notifications";

const STATUSES = ["present", "absent", "excused"] as const;
type Status = (typeof STATUSES)[number];

async function leaderDepartment(userId: string, departmentId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: departmentLeaders.id })
    .from(departmentLeaders)
    .where(
      and(
        eq(departmentLeaders.userId, userId),
        eq(departmentLeaders.departmentId, departmentId),
        isNull(departmentLeaders.endedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function back(eventId: string, key: "saved" | "error", message: string): never {
  redirect(`/member/leadership/${eventId}?${key}=${encodeURIComponent(message)}`);
}

export async function submitDepartmentAttendance(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "");
  const user = await requireUser(`/member/leadership/${eventId}`);
  if (!(await leaderDepartment(user.id, departmentId))) {
    back(eventId, "error", "You do not lead this department.");
  }

  const db = await getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) back(eventId, "error", "Event not found.");
  const [link] = await db
    .select({ eventId: eventDepartments.eventId })
    .from(eventDepartments)
    .where(
      and(
        eq(eventDepartments.eventId, eventId),
        eq(eventDepartments.departmentId, departmentId),
      ),
    )
    .limit(1);
  if (!link) back(eventId, "error", "This department is not part of the event.");

  const [existing] = await db
    .select({ id: attendanceSubmissions.id })
    .from(attendanceSubmissions)
    .where(
      and(
        eq(attendanceSubmissions.eventId, eventId),
        eq(attendanceSubmissions.departmentId, departmentId),
      ),
    )
    .limit(1);
  if (existing) back(eventId, "error", "Attendance is already submitted and locked.");

  const members = await db
    .select({ userId: departmentMembers.userId, name: users.name })
    .from(departmentMembers)
    .innerJoin(users, eq(users.id, departmentMembers.userId))
    .where(
      and(
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.isActive, true),
      ),
    );
  if (!members.length) back(eventId, "error", "This department has no active members.");

  const statuses: Array<{ userId: string; name: string; status: Status }> = [];
  for (const member of members) {
    const value = String(formData.get(`status_${member.userId}`) ?? "");
    if (!STATUSES.includes(value as Status)) {
      back(eventId, "error", `Mark attendance for ${member.name}.`);
    }
    statuses.push({ ...member, status: value as Status });
  }

  const now = new Date();
  for (const row of statuses) {
    await db
      .insert(attendanceRecords)
      .values({
        id: crypto.randomUUID(),
        eventId,
        userId: row.userId,
        status: row.status,
        recordedBy: user.id,
        recordedAt: now,
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.eventId, attendanceRecords.userId],
        set: {
          status: row.status,
          recordedBy: user.id,
          recordedAt: now,
        },
      });
  }

  const submissionId = crypto.randomUUID();
  await db.insert(attendanceSubmissions).values({
    id: submissionId,
    eventId,
    departmentId,
    submittedBy: user.id,
    status: "submitted",
    presentCount: statuses.filter((row) => row.status === "present").length,
    absentCount: statuses.filter((row) => row.status === "absent").length,
    excusedCount: statuses.filter((row) => row.status === "excused").length,
    submittedAt: now,
  });
  await db.insert(attendanceAudit).values({
    id: crypto.randomUUID(),
    attendanceId: null,
    action: "submission.created",
    actorId: user.id,
    details: JSON.stringify({
      submissionId,
      eventId,
      departmentId,
      present: statuses.filter((row) => row.status === "present").length,
      absent: statuses.filter((row) => row.status === "absent").length,
      excused: statuses.filter((row) => row.status === "excused").length,
    }),
    createdAt: now,
  });

  await notifyPermission(PERMISSIONS.memberReview, {
    type: NOTIFICATION_TYPES.adminNotice,
    title: "Attendance submitted",
    body: `${user.name} submitted ${event.title} for their department.`,
    link: "/admin/attendance",
  });

  await logAudit({
    actorId: user.id,
    action: "attendance.submitted",
    entityType: "event",
    entityId: eventId,
    details: `Attendance submitted for ${event.title}.`,
  });

  revalidatePath("/member");
  revalidatePath("/member/events");
  revalidatePath("/member/profile");
  revalidatePath(`/member/leadership/${eventId}`);
  revalidatePath("/admin/attendance");
  back(eventId, "saved", "Attendance submitted and locked.");
}

export async function requestAttendanceUnlock(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const user = await requireUser(`/member/leadership/${eventId}`);
  if (!(await leaderDepartment(user.id, departmentId))) {
    back(eventId, "error", "You do not lead this department.");
  }
  const db = await getDb();
  const [submission] = await db
    .select()
    .from(attendanceSubmissions)
    .where(
      and(
        eq(attendanceSubmissions.eventId, eventId),
        eq(attendanceSubmissions.departmentId, departmentId),
      ),
    )
    .limit(1);
  if (!submission) back(eventId, "error", "No submitted attendance to unlock.");
  if (submission.status === "unlock_requested") {
    back(eventId, "saved", "Unlock already requested.");
  }

  await db
    .update(attendanceSubmissions)
    .set({ status: "unlock_requested", notes: reason || null })
    .where(eq(attendanceSubmissions.id, submission.id));
  await db.insert(attendanceAudit).values({
    id: crypto.randomUUID(),
    attendanceId: null,
    action: "unlock.requested",
    actorId: user.id,
    details: reason || "Unlock requested.",
    createdAt: new Date(),
  });
  await notifyPermission(PERMISSIONS.memberReview, {
    type: NOTIFICATION_TYPES.adminNotice,
    title: "Attendance unlock requested",
    body: `${user.name} requested an unlock${reason ? `: ${reason}` : "."}`,
    link: "/admin/attendance",
  });
  await logAudit({
    actorId: user.id,
    action: "attendance.unlock_requested",
    entityType: "event",
    entityId: eventId,
    details: reason || "Unlock requested.",
  });
  revalidatePath(`/member/leadership/${eventId}`);
  revalidatePath("/admin/attendance");
  back(eventId, "saved", "Unlock request sent to the attendance team.");
}
