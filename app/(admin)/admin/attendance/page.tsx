import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowDownToLine,
  CalendarDays,
  ClipboardCheck,
  History,
  LockKeyhole,
  Send,
  Users,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  attendanceAudit,
  attendanceRecords,
  attendanceSubmissions,
  departments,
  events,
  memberProfiles,
  users,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  EmptyState,
  StatCard,
  SectionHeader,
} from "@/components/ui/display";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendAttendanceFollowup, unlockAttendance } from "./actions";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "submissions", label: "Submissions", icon: ClipboardCheck },
  { key: "reports", label: "Reports", icon: CalendarDays },
  { key: "followups", label: "Follow-ups", icon: AlertTriangle },
  { key: "audit", label: "Audit log", icon: History },
];

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.memberReview, "/admin/attendance");
  const params = await searchParams;
  const tab = tabs.some((item) => item.key === params.tab)
    ? (params.tab as string)
    : "submissions";
  const db = await getDb();

  const [submissions, eventList, records, auditRows, absentRows] =
    await Promise.all([
      db
        .select({
          id: attendanceSubmissions.id,
          status: attendanceSubmissions.status,
          notes: attendanceSubmissions.notes,
          presentCount: attendanceSubmissions.presentCount,
          absentCount: attendanceSubmissions.absentCount,
          excusedCount: attendanceSubmissions.excusedCount,
          submittedAt: attendanceSubmissions.submittedAt,
          eventId: attendanceSubmissions.eventId,
          eventTitle: events.title,
          eventDate: events.startsAt,
          departmentName: departments.name,
          submitterName: users.name,
        })
        .from(attendanceSubmissions)
        .innerJoin(events, eq(events.id, attendanceSubmissions.eventId))
        .innerJoin(
          departments,
          eq(departments.id, attendanceSubmissions.departmentId),
        )
        .innerJoin(users, eq(users.id, attendanceSubmissions.submittedBy))
        .orderBy(desc(attendanceSubmissions.submittedAt)),
      db.select().from(events).orderBy(desc(events.startsAt)),
      db
        .select({
          eventId: attendanceRecords.eventId,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords),
      db
        .select({
          id: attendanceAudit.id,
          action: attendanceAudit.action,
          details: attendanceAudit.details,
          createdAt: attendanceAudit.createdAt,
          actorName: users.name,
        })
        .from(attendanceAudit)
        .leftJoin(users, eq(users.id, attendanceAudit.actorId))
        .orderBy(desc(attendanceAudit.createdAt))
        .limit(100),
      db
        .select({
          userId: attendanceRecords.userId,
          name: users.name,
          email: users.email,
          memberCode: memberProfiles.memberCode,
          status: attendanceRecords.status,
          markedAt: attendanceRecords.markedAt,
        })
        .from(attendanceRecords)
        .innerJoin(users, eq(users.id, attendanceRecords.userId))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
        .where(eq(attendanceRecords.status, "absent")),
    ]);

  const totals = submissions.reduce(
    (acc, row) => {
      acc.present += row.presentCount;
      acc.absent += row.absentCount;
      acc.excused += row.excusedCount;
      return acc;
    },
    { present: 0, absent: 0, excused: 0 },
  );
  const marked = totals.present + totals.absent + totals.excused;
  const rate = marked ? Math.round((totals.present / marked) * 100) : 0;
  const unlockRequests = submissions.filter(
    (row) => row.status === "unlock_requested",
  ).length;

  const recordsByEvent = new Map<
    string,
    { present: number; absent: number; excused: number; total: number }
  >();
  for (const record of records) {
    const current = recordsByEvent.get(record.eventId) ?? {
      present: 0,
      absent: 0,
      excused: 0,
      total: 0,
    };
    if (record.status === "present") current.present += 1;
    else if (record.status === "absent") current.absent += 1;
    else current.excused += 1;
    current.total += 1;
    recordsByEvent.set(record.eventId, current);
  }

  const absentByMember = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      memberCode: string | null;
      absences: number;
      lastAbsent: Date;
    }
  >();
  for (const row of absentRows) {
    const current = absentByMember.get(row.userId);
    if (current) {
      current.absences += 1;
      if (row.markedAt > current.lastAbsent) current.lastAbsent = row.markedAt;
    } else {
      absentByMember.set(row.userId, {
        userId: row.userId,
        name: row.name,
        email: row.email,
        memberCode: row.memberCode,
        absences: 1,
        lastAbsent: row.markedAt,
      });
    }
  }
  const followups = [...absentByMember.values()]
    .filter((row) => row.absences >= 2)
    .sort((a, b) => b.absences - a.absences)
    .slice(0, 50);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Member care
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Attendance</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Review unit submissions, unlock corrections, export records and follow
            up with members who have been absent.
          </p>
        </div>
        <a
          href="/api/admin/attendance/export"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 active:scale-[0.98] active:opacity-80"
        >
          <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
          Export all CSV
        </a>
      </div>

      {params.saved ? (
        <FormMessage tone="success">{params.saved}</FormMessage>
      ) : null}
      {params.error ? <FormMessage>{params.error}</FormMessage> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Submissions"
          value={submissions.length}
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Attendance rate"
          value={`${rate}%`}
          tone="green"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Absences"
          value={totals.absent}
          tone="gold"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Unlock requests"
          value={unlockRequests}
          tone="charcoal"
          icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
        />
      </section>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/admin/attendance?tab=${item.key}`}
              prefetch
              className={
                tab === item.key
                  ? "inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-brand-700 bg-brand-700 px-3.5 text-sm font-semibold text-cream"
                  : "inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-brand-200 bg-white px-3.5 text-sm font-semibold text-charcoal/70"
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === "submissions" ? (
        <section className="space-y-3">
          <SectionHeader
            title="Unit submissions"
            description="Submissions lock automatically. Unlocking lets the unit leader correct and resubmit."
          />
          {submissions.length ? (
            submissions.map((row) => (
              <article key={row.id} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg font-semibold">
                      {row.eventTitle}
                    </h2>
                    <p className="mt-0.5 text-sm text-charcoal/55">
                      {row.departmentName} · {formatDate(row.eventDate)} ·{" "}
                      {row.submitterName}
                    </p>
                  </div>
                  <Badge
                    tone={
                      row.status === "unlock_requested" ? "gold" : "green"
                    }
                  >
                    {row.status === "unlock_requested"
                      ? "Unlock requested"
                      : "Submitted"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                    {row.presentCount} present
                  </span>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                    {row.absentCount} absent
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                    {row.excusedCount} excused
                  </span>
                  <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-charcoal/60">
                    {formatDateTime(row.submittedAt)}
                  </span>
                </div>
                {row.notes ? (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    <span className="font-semibold">Unlock reason:</span>{" "}
                    {row.notes}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/admin/attendance/export?eventId=${row.eventId}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-800"
                  >
                    <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                    Export event
                  </a>
                  <form action={unlockAttendance}>
                    <input type="hidden" name="submissionId" value={row.id} />
                    <SubmitButton
                      variant="outline"
                      size="sm"
                      pendingLabel="Unlocking..."
                    >
                      Unlock for correction
                    </SubmitButton>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={<ClipboardCheck className="h-6 w-6" aria-hidden="true" />}
              title="No attendance submitted yet"
              description="Unit leaders submit attendance from the member area after an event."
            />
          )}
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="space-y-3">
          <SectionHeader
            title="Event reports"
            description="Recorded attendance by event. Export a CSV for any event or the whole church."
          />
          {eventList.length ? (
            eventList.map((event) => {
              const counts = recordsByEvent.get(event.id);
              const eventRate =
                counts && counts.total
                  ? Math.round((counts.present / counts.total) * 100)
                  : 0;
              return (
                <article key={event.id} className="surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-serif text-lg font-semibold">
                        {event.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-charcoal/55">
                        {event.category} · {formatDate(event.startsAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-800">
                      {eventRate}%
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-charcoal/60">
                      {counts?.total ?? 0} marked
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                      {counts?.present ?? 0} present
                    </span>
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                      {counts?.absent ?? 0} absent
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                      {counts?.excused ?? 0} excused
                    </span>
                  </div>
                  {counts?.total ? (
                    <a
                      href={`/api/admin/attendance/export?eventId=${event.id}`}
                      className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-800"
                    >
                      <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                      Export CSV
                    </a>
                  ) : null}
                </article>
              );
            })
          ) : (
            <EmptyState
              title="No events yet"
              description="Create events before collecting attendance."
            />
          )}
        </section>
      ) : null}

      {tab === "followups" ? (
        <section className="space-y-3">
          <SectionHeader
            title="Follow-ups"
            description="Members with two or more recorded absences. Send a caring in-app message, not a warning."
          />
          {followups.length ? (
            followups.map((row) => (
              <article key={row.userId} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg font-semibold">{row.name}</h2>
                    <p className="mt-0.5 text-sm text-charcoal/55">
                      {row.memberCode ?? "Member"} · {row.email}
                    </p>
                  </div>
                  <Badge tone="gold">{row.absences} absences</Badge>
                </div>
                <p className="mt-2 text-xs text-charcoal/45">
                  Last absent: {formatDate(row.lastAbsent)}
                </p>
                <form action={sendAttendanceFollowup} className="mt-3 space-y-2">
                  <input type="hidden" name="userId" value={row.userId} />
                  <textarea
                    name="message"
                    maxLength={500}
                    rows={3}
                    placeholder="Optional personal message. Leave blank to send the default care message."
                    className="min-h-24 w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm text-charcoal shadow-sm placeholder:text-charcoal/40 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                  />
                  <SubmitButton
                    variant="outline"
                    size="sm"
                    pendingLabel="Sending..."
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send follow-up
                  </SubmitButton>
                </form>
              </article>
            ))
          ) : (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
              title="No follow-ups needed"
              description="Members with repeated absences will appear here."
            />
          )}
        </section>
      ) : null}

      {tab === "audit" ? (
        <section className="surface p-4 sm:p-5">
          <SectionHeader
            title="Attendance audit log"
            description="Submissions, unlocks and follow-up messages."
          />
          {auditRows.length ? (
            <div className="mt-3 divide-y divide-brand-100">
              {auditRows.map((row) => (
                <div key={row.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {row.action.replaceAll(".", " · ")}
                    </p>
                    <p className="text-xs text-charcoal/45">
                      {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 break-words text-xs leading-5 text-charcoal/55">
                    {row.actorName ?? "System"}
                    {row.details ? ` — ${row.details}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<History className="h-6 w-6" aria-hidden="true" />}
              title="No attendance activity yet"
              description="Submissions, unlocks and follow-ups will be logged here."
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
