import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { notifyPermission } from "@/lib/notifications";
import { PERMISSIONS, NOTIFICATION_TYPES } from "@/lib/constants";
import {
  clientIpFromHeaders,
  checkRateLimit,
  rateLimitKey,
} from "@/lib/rate-limit";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";
import { appointmentRequestSchema } from "@/lib/validation";
import {
  formatAppointmentWhen,
  parseAvailability,
  validateSelection,
} from "@/lib/appointments";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();

  const body = await readJson<unknown>(request);
  const parsed = appointmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Check the appointment details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const settings = await getSettings();
  const availability = parseAvailability(settings);
  const selectionError = validateSelection(
    availability,
    data.preferredDate,
    data.preferredTime,
  );
  if (selectionError) {
    return NextResponse.json({ error: selectionError }, { status: 400 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const ipLimit = await checkRateLimit(
    rateLimitKey("appointment:ip", ip),
    6,
    60 * 60,
  );
  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many appointment requests from this device. Please try again later.",
      },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  const emailLimit = await checkRateLimit(
    rateLimitKey("appointment:email", data.email),
    3,
    60 * 60,
  );
  if (!emailLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "You have already sent a few requests. Please wait before trying again.",
      },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfter) } },
    );
  }

  const user = await getSessionUser();
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  const when = formatAppointmentWhen(data.preferredDate, data.preferredTime);

  await db.insert(appointments).values({
    id,
    userId: user?.id ?? null,
    requestedBy: user?.id ?? null,
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    title: data.purpose,
    notes: data.message || null,
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime,
    slotKey: `${data.preferredDate}T${data.preferredTime}`,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  await notifyPermission(PERMISSIONS.appointmentManage, {
    type: NOTIFICATION_TYPES.appointmentRequest,
    title: "New appointment request",
    body: `${data.fullName} requested ${when}. Purpose: ${data.purpose}`,
    link: "/admin/appointments",
  });

  await logAudit({
    actorId: user?.id ?? null,
    action: "appointment.requested",
    entityType: "appointment",
    entityId: id,
    details: `${data.fullName} requested an appointment for ${when}.`,
    ipAddress: ip === "local" ? null : ip,
  });

  return NextResponse.json({
    ok: true,
    reference: id.slice(0, 8).toUpperCase(),
    when,
  });
}
