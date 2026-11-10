import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  LockKeyhole,
  MapPin,
  UnlockKeyhole,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  attendanceRecords,
  attendanceSubmissions,
  departmentLeaders,
  departmentMembers,
  departments,
  eventDepartments,
  events,
  memberProfiles,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHero, Badge } from "@/components/ui/display";
import { FormField, FormMessage, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { LeaderAttendanceForm } from "@/components/member/leader-attendance-form";
import { LogoutButton } from "@/components/ui/logout-button";
import { requestAttendanceUnlock } from "../actions";

export const metadata: Metadata = { title: "Mark attendance" };
export const dynamic = "force-dynamic";

function lagosTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function LeaderAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { eventId } = await params;
  const { saved, error } = await searchParams;
  const user = await requireUser(`/member/leadership/${eventId}`);
  const db = await getDb();

  const leaderRows = await db
    .select({ departmentId: departmentLeaders.departmentId })
    .from(departmentLeaders)
    .innerJoin(departments, eq(departments.id, departmentLeaders.departmentId))
    .where(
      and(
        eq(departmentLeaders.userId, user.id),
        isNull(departmentLeaders.endedAt),
        eq(departments.isActive, true),
      ),
    );
  const leaderIds = leaderRows.map((row) => row.departmentId);
  if (!leaderIds.length) notFound();

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.isPublished, true)))
    .limit(1);
  if (!event) notFound();

  const participating = await db
    .select({
      departmentId: departments.id,
      departmentName: departments.name,
    })
    .from(eventDepartments)
    .innerJoin(departments, eq(departments.id, eventDepartments.departmentId))
    .where(
      and(
        eq(eventDepartments.eventId, eventId),
        inArray(eventDepartments.departmentId, leaderIds),
      ),
    )
    .orderBy(departments.name);
  if (!participating.length) notFound();

  const participantIds = participating.map((row) => row.departmentId);
  const [members, submissions, marks] = await Promise.all([
    db
      .select({
        departmentId: departmentMembers.departmentId,
        userId: departmentMembers.userId,
        name: users.name,
        memberCode: memberProfiles.memberCode,
      })
      .from(departmentMembers)
      .innerJoin(users, eq(users.id, departmentMembers.userId))
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(
        and(
          inArray(departmentMembers.departmentId, participantIds),
          eq(departmentMembers.isActive, true),
        ),
      )
      .orderBy(users.name),
    db
      .select()
      .from(attendanceSubmissions)
      .where(eq(attendanceSubmissions.eventId, eventId)),
    db
      .select({ userId: attendanceRecords.userId, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.eventId, eventId)),
  ]);

  const marksByUser = new Map(marks.map((row) => [row.userId, row.status]));
  const submissionByDepartment = new Map(
    submissions.map((row) => [row.departmentId, row]),
  );

  return (
    <div className="space-y-5">
      <Link
        href="/member/events"
        prefetch
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to events
      </Link>

      <PageHero
        eyebrow="Unit leader"
        title={event.title}
        description={`${event.category} · ${formatDate(
          event.startsAt,
        )} · ${lagosTime(event.startsAt)}${
          event.endsAt ? `–${lagosTime(event.endsAt)}` : ""
        }`}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-charcoal/60">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDate(event.startsAt)}
        </span>
        {event.location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {event.location}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          Mark within your department only
        </span>
      </div>

      {saved ? <FormMessage tone="success">{saved}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      {participating.map((department) => {
        const submission = submissionByDepartment.get(department.departmentId);
        const departmentMembersList = members.filter(
          (member) => member.departmentId === department.departmentId,
        );
        const counts = {
          present: departmentMembersList.filter(
            (member) => marksByUser.get(member.userId) === "present",
          ).length,
          absent: departmentMembersList.filter(
            (member) => marksByUser.get(member.userId) === "absent",
          ).length,
          excused: departmentMembersList.filter(
            (member) => marksByUser.get(member.userId) === "excused",
          ).length,
        };

        return (
          <section
            key={department.departmentId}
            className="surface p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold">
                  {department.departmentName}
                </h2>
                <p className="mt-1 text-sm text-charcoal/55">
                  {departmentMembersList.length} active member
                  {departmentMembersList.length === 1 ? "" : "s"}
                </p>
              </div>
              {submission ? (
                <Badge
                  tone={
                    submission.status === "unlock_requested" ? "gold" : "success"
                  }
                >
                  {submission.status === "unlock_requested"
                    ? "Unlock requested"
                    : "Locked"}
                </Badge>
              ) : (
                <Badge tone="brand">Open</Badge>
              )}
            </div>

            {submission ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    Submitted {formatDateTime(submission.submittedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-2.5 py-1 text-emerald-800">
                      {counts.present} present
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-red-700">
                      {counts.absent} absent
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-amber-800">
                      {counts.excused} excused
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-900/70">
                    Attendance is locked after submission. Ask the attendance team
                    to unlock it if a correction is needed.
                  </p>
                </div>
                {submission.status === "unlock_requested" ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Your unlock request has been sent. You can submit again after
                    the attendance team unlocks it.
                  </p>
                ) : (
                  <details className="rounded-2xl border border-brand-100 p-3">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-brand-800">
                      <UnlockKeyhole className="h-4 w-4" aria-hidden="true" />
                      Request unlock
                    </summary>
                    <form action={requestAttendanceUnlock} className="mt-3 space-y-3">
                      <input type="hidden" name="eventId" value={eventId} />
                      <input
                        type="hidden"
                        name="departmentId"
                        value={department.departmentId}
                      />
                      <FormField label="Reason" htmlFor={`reason-${department.departmentId}`}>
                        <Textarea
                          id={`reason-${department.departmentId}`}
                          name="reason"
                          maxLength={500}
                          placeholder="Briefly explain the correction needed."
                        />
                      </FormField>
                      <SubmitButton
                        variant="outline"
                        pendingLabel="Sending request..."
                      >
                        Send unlock request
                      </SubmitButton>
                    </form>
                  </details>
                )}
              </div>
            ) : departmentMembersList.length ? (
              <div className="mt-4">
                <LeaderAttendanceForm
                  eventId={eventId}
                  departmentId={department.departmentId}
                  members={departmentMembersList.map((member) => ({
                    userId: member.userId,
                    name: member.name,
                    memberCode: member.memberCode,
                    status: marksByUser.get(member.userId) ?? null,
                  }))}
                />
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-brand-200 p-5 text-sm text-charcoal/55">
                No active members are assigned to this department yet.
              </p>
            )}
          </section>
        );
      })}

      <div className="flex justify-end">
        <LogoutButton />
      </div>
    </div>
  );
}
