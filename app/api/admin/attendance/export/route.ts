import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  attendanceRecords,
  events,
  memberProfiles,
  users,
} from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

function cell(value: string | number | Date | null) {
  const text =
    value instanceof Date
      ? value.toISOString()
      : value === null
        ? ""
        : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const auth = await requireApiUser(PERMISSIONS.memberReview);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  const db = await getDb();
  const rows = await db
    .select({
      eventTitle: events.title,
      eventDate: events.startsAt,
      eventCategory: events.category,
      name: users.name,
      email: users.email,
      memberCode: memberProfiles.memberCode,
      status: attendanceRecords.status,
      markedAt: attendanceRecords.markedAt,
    })
    .from(attendanceRecords)
    .innerJoin(events, eq(events.id, attendanceRecords.eventId))
    .innerJoin(users, eq(users.id, attendanceRecords.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(eventId ? eq(attendanceRecords.eventId, eventId) : undefined)
    .orderBy(desc(events.startsAt), asc(users.name));

  const header = [
    "Event",
    "Event date",
    "Category",
    "Member",
    "Member ID",
    "Email",
    "Status",
    "Marked at",
  ];
  const csv = [
    header.map(cell).join(","),
    ...rows.map((row) =>
      [
        row.eventTitle,
        row.eventDate,
        row.eventCategory,
        row.name,
        row.memberCode,
        row.email,
        row.status,
        row.markedAt,
      ]
        .map(cell)
        .join(","),
    ),
  ].join("\r\n");

  await logAudit({
    actorId: auth.user.id,
    action: "attendance.exported",
    entityType: "event",
    entityId: eventId ?? null,
    details: eventId
      ? `Exported attendance for event ${eventId}.`
      : "Exported all attendance records.",
  });

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${
        eventId ? `${eventId}-` : ""
      }${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
