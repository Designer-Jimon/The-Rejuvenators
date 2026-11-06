"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notificationPreferences, notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { NOTIFICATION_TYPES } from "@/lib/constants";

const preferenceTypes = [
  NOTIFICATION_TYPES.memberRegistration,
  NOTIFICATION_TYPES.memberApproved,
  NOTIFICATION_TYPES.memberRejected,
  NOTIFICATION_TYPES.memberStatus,
  NOTIFICATION_TYPES.leaderAssigned,
  NOTIFICATION_TYPES.appointmentUpdate,
  NOTIFICATION_TYPES.eventCreated,
  NOTIFICATION_TYPES.devotionalPublished,
  NOTIFICATION_TYPES.attendanceFollowup,
  NOTIFICATION_TYPES.general,
];

export async function markAllNotificationsRead() {
  const user = await requireUser("/member/notifications");
  const db = await getDb();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false),
      ),
    );
  revalidatePath("/member");
  revalidatePath("/member/notifications");
}

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireUser("/member/settings");
  const db = await getDb();

  for (const type of preferenceTypes) {
    const inApp = formData.get(`inApp_${type}`) === "on";
    await db
      .insert(notificationPreferences)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        type,
        inApp,
        email: false,
        whatsapp: false,
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.type],
        set: { inApp },
      });
  }

  revalidatePath("/member/settings");
  redirect("/member/settings?saved=1");
}
