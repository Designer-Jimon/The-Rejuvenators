"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { attendanceSubmissions, events, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { NOTIFICATION_TYPES, PERMISSIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

function back(tab: string, key: "saved" | "error", message: string): never {
  redirect(`/admin/attendance?tab=${tab}&${key}=${encodeURIComponent(message)}`);
}

export async function unlockAttendance(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.memberReview,
    "/admin/attendance",
  );
  const submissionId = String(formData.get("submissionId") ?? "");
  const db = await getDb();
  const [row] = await db
    .select({
      submission: attendanceSubmissions,
      eventTitle: events.title,
    })
    .from(attendanceSubmissions)
    .innerJoin(events, eq(events.id, attendanceSubmissions.eventId))
    .where(eq(attendanceSubmissions.id, submissionId))
    .limit(1);
  if (!row) back("submissions", "error", "Submission not found.");

  await db
    .delete(attendanceSubmissions)
    .where(eq(attendanceSubmissions.id, submissionId));
  await logAudit({
    actorId: user.id,
    action: "attendance.unlocked",
    entityType: "event",
    entityId: row.submission.eventId,
    details: `Unlocked attendance for ${row.eventTitle}.`,
  });
  await notifyUser(row.submission.submittedBy, {
    type: NOTIFICATION_TYPES.adminNotice,
    title: "Attendance unlocked",
    body: `Your attendance submission for ${row.eventTitle} was unlocked. You can edit and resubmit it.`,
    link: `/member/leadership/${row.submission.eventId}`,
  });
  revalidatePath("/admin/attendance");
  revalidatePath(`/member/leadership/${row.submission.eventId}`);
  back("submissions", "saved", "Attendance unlocked. The unit leader can resubmit.");
}

export async function sendAttendanceFollowup(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.memberReview,
    "/admin/attendance",
  );
  const userId = String(formData.get("userId") ?? "");
  const message = String(formData.get("message") ?? "")
    .trim()
    .slice(0, 500);
  const db = await getDb();
  const [member] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!member) back("followups", "error", "Member not found.");

  await notifyUser(member.id, {
    type: NOTIFICATION_TYPES.attendanceFollowup,
    title: "We missed you",
    body:
      message ||
      "We noticed you have missed a few recent gatherings. The church family would love to hear from you.",
    link: "/member/events",
  });
  await logAudit({
    actorId: user.id,
    action: "attendance.followup_sent",
    entityType: "member",
    entityId: member.id,
    details: `Attendance follow-up sent to ${member.name}.`,
  });
  revalidatePath("/admin/attendance");
  back("followups", "saved", "Follow-up sent.");
}
