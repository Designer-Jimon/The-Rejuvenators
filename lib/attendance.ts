import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  attendanceRecords,
  departmentLeaders,
  departments,
  eventDepartments,
  events,
} from "@/lib/db/schema";

export type AttendanceStats = {
  sunday: number;
  midweek: number;
  special: number;
  overall: number;
  totalMarked: number;
  percentage: number;
};

const MIDWEEK: string[] = ["Bible Study", "Rejuvenators Service"];
const SPECIAL: string[] = [
  "Night Vigil",
  "Revival Program",
  "Special Prayer Meeting",
  "Other",
];

export async function getMemberAttendanceStats(
  userId: string,
): Promise<AttendanceStats> {
  const db = await getDb();
  const rows = await db
    .select({
      status: attendanceRecords.status,
      category: events.category,
    })
    .from(attendanceRecords)
    .innerJoin(events, eq(events.id, attendanceRecords.eventId))
    .where(eq(attendanceRecords.userId, userId));

  let sunday = 0;
  let midweek = 0;
  let special = 0;
  let totalMarked = 0;

  for (const row of rows) {
    totalMarked += 1;
    if (row.status !== "present") continue;
    if (row.category === "Sunday Service") sunday += 1;
    else if (MIDWEEK.includes(row.category)) midweek += 1;
    else if (SPECIAL.includes(row.category)) special += 1;
    else special += 1;
  }

  const overall = sunday + midweek + special;
  return {
    sunday,
    midweek,
    special,
    overall,
    totalMarked,
    percentage: totalMarked ? Math.round((overall / totalMarked) * 100) : 0,
  };
}

export async function getActiveLeaderDepartments(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: departments.id,
      name: departments.name,
      leaderId: departmentLeaders.id,
      startedAt: departmentLeaders.startedAt,
    })
    .from(departmentLeaders)
    .innerJoin(departments, eq(departments.id, departmentLeaders.departmentId))
    .where(
      and(
        eq(departmentLeaders.userId, userId),
        isNull(departmentLeaders.endedAt),
        eq(departments.isActive, true),
      ),
    )
    .orderBy(asc(departments.name));
}

export async function getLeaderEvents(departmentIds: string[]) {
  if (!departmentIds.length) return [];
  const db = await getDb();
  const rows = await db
    .selectDistinct({
      id: events.id,
      title: events.title,
      category: events.category,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      location: events.location,
    })
    .from(events)
    .innerJoin(eventDepartments, eq(eventDepartments.eventId, events.id))
    .where(
      and(
        eq(events.isPublished, true),
        inArray(eventDepartments.departmentId, departmentIds),
      ),
    )
    .orderBy(asc(events.startsAt));
  return rows;
}
