import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { PERMISSIONS, NOTIFICATION_TYPES } from "@/lib/constants";
import { CHURCH_NAME } from "@/lib/branding";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { notifyUser } from "@/lib/notifications";
import { sendAppointmentEmail } from "@/lib/email";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";
import { appointmentAdminActionSchema } from "@/lib/validation";
import {
  formatAppointmentWhen,
  parseAvailability,
  validateSelection,
  whatsappUrl,
} from "@/lib/appointments";

class AppointmentActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();

  const auth = await requireApiUser(PERMISSIONS.appointmentManage);
  if (auth.response) return auth.response;
  const user = auth.user;

  const body = await readJson<unknown>(request);
  const parsed = appointmentAdminActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid appointment action." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const action = parsed.data;
  const settings = await getSettings();
  const availability = parseAvailability(settings);
  const db = await getDb();
  const now = new Date();

  try {
    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!current) {
        throw new AppointmentActionError("Appointment not found.", 404);
      }

      let update: Partial<typeof appointments.$inferInsert> = {
        handledBy: user.id,
        updatedAt: now,
      };
      let notificationTitle = "Appointment update";
      let notificationBody = "";

      if (action.action === "approve") {
        const date = current.suggestedDate ?? current.preferredDate;
        const time = current.suggestedTime ?? current.preferredTime;
        const selectionError = validateSelection(availability, date, time);
        if (selectionError) {
          throw new AppointmentActionError(selectionError);
        }
        const slotKey = `${date}T${time}`;
        const [conflict] = await tx
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.status, "confirmed"),
              eq(appointments.slotKey, slotKey),
              ne(appointments.id, current.id),
            ),
          )
          .limit(1);
        if (conflict) {
          throw new AppointmentActionError(
            "That slot is already confirmed. Suggest another date or time.",
            409,
          );
        }
        update = {
          ...update,
          status: "confirmed",
          slotKey,
        };
        notificationTitle = "Appointment confirmed";
        notificationBody = `Your appointment is confirmed for ${formatAppointmentWhen(date, time)}.`;
      } else if (action.action === "decline") {
        update = { ...update, status: "declined" };
        notificationTitle = "Appointment declined";
        notificationBody = `Unfortunately we cannot keep your appointment request for ${formatAppointmentWhen(current.preferredDate, current.preferredTime)}. Please contact the church office to rebook.`;
      } else if (action.action === "suggest") {
        const selectionError = validateSelection(
          availability,
          action.suggestedDate,
          action.suggestedTime,
        );
        if (selectionError) {
          throw new AppointmentActionError(selectionError);
        }
        update = {
          ...update,
          status: "suggested",
          suggestedDate: action.suggestedDate,
          suggestedTime: action.suggestedTime,
        };
        notificationTitle = "New appointment time suggested";
        notificationBody = `We suggest ${formatAppointmentWhen(action.suggestedDate, action.suggestedTime)}. Please reply to confirm or contact the church office.`;
      } else if (action.action === "complete") {
        update = { ...update, status: "completed" };
        notificationTitle = "Appointment completed";
        notificationBody = `Your appointment on ${formatAppointmentWhen(current.suggestedDate ?? current.preferredDate, current.suggestedTime ?? current.preferredTime)} has been marked completed. Thank you.`;
      } else {
        update = { ...update, adminNote: action.adminNote };
        notificationTitle = "Appointment update";
        notificationBody = action.adminNote;
      }

      await tx
        .update(appointments)
        .set(update)
        .where(eq(appointments.id, current.id));

      return { current, update, notificationTitle, notificationBody };
    });

    if (result.current.userId) {
      await notifyUser(result.current.userId, {
        type: NOTIFICATION_TYPES.appointmentUpdate,
        title: result.notificationTitle,
        body: result.notificationBody,
        link: "/member/appointments",
      });
    }

    try {
      await sendAppointmentEmail(
        result.current.email,
        result.notificationTitle,
        [result.notificationBody],
      );
    } catch (emailError) {
      console.error("Appointment email failed", emailError);
    }

    await logAudit({
      actorId: user.id,
      action: `appointment.${action.action}`,
      entityType: "appointment",
      entityId: result.current.id,
      details: `${result.notificationTitle} for ${result.current.fullName}.`,
    });

    const message = `Hello ${result.current.fullName}, ${result.notificationBody} - ${CHURCH_NAME}`;

    return NextResponse.json({
      ok: true,
      message: result.notificationTitle,
      whatsappUrl: whatsappUrl(result.current.phone, message),
    });
  } catch (error) {
    if (error instanceof AppointmentActionError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    if (String(error).toLowerCase().includes("unique")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "That slot is already confirmed. Suggest another date or time.",
        },
        { status: 409 },
      );
    }
    console.error("Admin appointment action failed", error);
    return NextResponse.json(
      { ok: false, error: "The action could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
