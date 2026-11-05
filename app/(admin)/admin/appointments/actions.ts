"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { appointmentAvailabilitySchema } from "@/lib/validation";

export async function saveAppointmentAvailability(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.appointmentManage,
    "/admin/appointments",
  );

  const days = Array.from(
    new Set(formData.getAll("days").map((value) => Number(value))),
  );
  const parsed = appointmentAvailabilitySchema.safeParse({
    days,
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
    slotMinutes: Number(formData.get("slotMinutes")),
  });

  if (!parsed.success) {
    redirect(
      `/admin/appointments?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Check the availability settings.",
      )}`,
    );
  }

  const db = await getDb();
  const now = new Date();
  const values: Record<string, string> = {
    appointment_days: parsed.data.days.sort((a, b) => a - b).join(","),
    appointment_start: parsed.data.start,
    appointment_end: parsed.data.end,
    appointment_slot_minutes: String(parsed.data.slotMinutes),
  };

  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: now, updatedBy: user.id })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: now, updatedBy: user.id },
      });
  }

  await logAudit({
    actorId: user.id,
    action: "appointment.availability_updated",
    entityType: "appointment",
    details: `Availability: ${values.appointment_days} ${values.appointment_start}-${values.appointment_end}, ${values.appointment_slot_minutes} minute slots.`,
  });

  revalidatePath("/appointments");
  revalidatePath("/admin/appointments");
  redirect("/admin/appointments?saved=Availability%20saved.");
}
