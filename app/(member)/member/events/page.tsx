import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  attendanceRecords,
  departmentLeaders,
  departmentMembers,
  departments,
  eventDepartments,
  events,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { getMemberAttendanceStats } from "@/lib/attendance";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { PageHero, StatCard, EmptyState, Badge } from "@/components/ui/display";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

function lagosTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function MemberEventsPage() {
  const user = await requireUser("/member/events");
  const db = await getDb();
  const now = new Date();

  const [
    upcoming,
    past,
    links,
    stats,
    leaderRows,
    membershipRows,
    myAttendance,
  ] = await Promise.all([
      db
        .select()
        .from(events)
        .where(
          and(eq(events.isPublished, true), gte(events.startsAt, now)),
        )
        .orderBy(asc(events.startsAt)),
      db
        .select()
        .from(events)
        .where(and(eq(events.isPublished, true), lt(events.startsAt, now)))
        .orderBy(desc(events.startsAt))
        .limit(6),
      db
        .select({
          eventId: eventDepartments.eventId,
          departmentId: eventDepartments.departmentId,
          departmentName: departments.name,
        })
        .from(eventDepartments)
        .innerJoin(departments, eq(departments.id, eventDepartments.departmentId)),
      getMemberAttendanceStats(user.id),
      db
        .select({
          departmentId: departments.id,
          departmentName: departments.name,
        })
        .from(departmentLeaders)
        .innerJoin(departments, eq(departments.id, departmentLeaders.departmentId))
        .where(
          and(
            eq(departmentLeaders.userId, user.id),
            eq(departments.isActive, true),
          ),
        ),
      db
        .select({ departmentId: departmentMembers.departmentId })
        .from(departmentMembers)
        .where(
          and(
            eq(departmentMembers.userId, user.id),
            eq(departmentMembers.isActive, true),
          ),
        ),
      db
        .select({
          eventId: attendanceRecords.eventId,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.userId, user.id)),
    ]);

  const leaderDepartmentIds = leaderRows.map((row) => row.departmentId);
  const leaderEvents = leaderDepartmentIds.length
    ? await db
        .selectDistinct({
          id: events.id,
          title: events.title,
          category: events.category,
          startsAt: events.startsAt,
        })
        .from(events)
        .innerJoin(eventDepartments, eq(eventDepartments.eventId, events.id))
        .where(
          and(
            eq(events.isPublished, true),
            inArray(eventDepartments.departmentId, leaderDepartmentIds),
          ),
        )
        .orderBy(desc(events.startsAt))
        .limit(8)
    : [];
  const leaderEventList = leaderEvents;

  const departmentsByEvent = new Map<string, string[]>();
  for (const link of links) {
    departmentsByEvent.set(link.eventId, [
      ...(departmentsByEvent.get(link.eventId) ?? []),
      link.departmentName,
    ]);
  }
  const myAttendanceByEvent = new Map(
    myAttendance.map((row) => [row.eventId, row.status]),
  );
  const myDepartments = new Set([
    ...leaderDepartmentIds,
    ...membershipRows.map((row) => row.departmentId),
  ]);
  const myDepartmentIds = new Set(
    links
      .filter((link) => myDepartments.has(link.departmentId))
      .map((link) => link.eventId),
  );

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Church family"
        title="Events"
        description="Upcoming services and gatherings. Events for your unit are highlighted, and your recent attendance is shown below."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Marked events"
          value={stats.totalMarked}
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Times present"
          value={stats.overall}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Sunday service"
          value={stats.sunday}
          tone="gold"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Attendance rate"
          value={`${stats.percentage}%`}
          tone="neutral"
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
        />
      </section>

      {leaderEventList.length ? (
        <section className="surface border-brand-700/20 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                Unit leader
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold">
                Attendance to mark
              </h2>
              <p className="mt-1 text-sm text-charcoal/60">
                {leaderRows.map((row) => row.departmentName).join(" · ")}
              </p>
            </div>
            <ClipboardCheck className="h-8 w-8 text-brand-700" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {leaderEventList.map((event) => (
              <Link
                key={event.id}
                href={`/member/leadership/${event.id}`}
                prefetch
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 transition active:scale-[0.99] active:opacity-80"
              >
                <span>
                  <span className="block text-sm font-semibold">{event.title}</span>
                  <span className="mt-0.5 block text-xs text-charcoal/55">
                    {formatDate(event.startsAt)} · {event.category}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Upcoming</h2>
          <CalendarDays className="h-5 w-5 text-brand-700" aria-hidden="true" />
        </div>
        {upcoming.length ? (
          <div className="space-y-3">
            {upcoming.map((event) => {
              const assigned = departmentsByEvent.get(event.id) ?? [];
              return (
                <article
                  key={event.id}
                  className={
                    myDepartmentIds.has(event.id)
                      ? "surface overflow-hidden border-brand-700/40 ring-1 ring-brand-700/10"
                      : "surface overflow-hidden"
                  }
                >
                  {event.coverKey ? (
                    <div className="relative aspect-[16/7] bg-brand-50">
                      <Image
                        src={publicMediaUrl(event.coverKey) ?? ""}
                        alt={event.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 720px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{event.category}</Badge>
                      {myDepartmentIds.has(event.id) ? (
                        <Badge tone="gold">Your unit</Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-2 font-serif text-xl font-semibold">
                      {event.title}
                    </h3>
                    <div className="mt-2 space-y-1.5 text-sm text-charcoal/65">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {formatDate(event.startsAt)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {event.endsAt
                          ? `${lagosTime(event.startsAt)} – ${lagosTime(event.endsAt)}`
                          : lagosTime(event.startsAt)}
                      </p>
                      {event.location ? (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {event.location}
                        </p>
                      ) : null}
                    </div>
                    {event.description ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-charcoal/70">
                        {event.description}
                      </p>
                    ) : null}
                    {event.instructions ? (
                      <p className="mt-3 whitespace-pre-line rounded-2xl bg-brand-50/70 p-4 text-sm leading-6 text-charcoal/65">
                        {event.instructions}
                      </p>
                    ) : null}
                    {assigned.length ? (
                      <p className="mt-3 text-xs text-charcoal/50">
                        Participating: {assigned.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No upcoming events"
            description="Published events will appear here with their date, time and location."
          />
        )}
      </section>

      {past.length ? (
        <section className="surface p-5">
          <h2 className="font-serif text-xl font-semibold">Recent events</h2>
          <div className="mt-3 space-y-2">
            {past.map((event) => {
              const status = myAttendanceByEvent.get(event.id);
              return (
                <div
                  key={event.id}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-brand-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="mt-0.5 text-xs text-charcoal/50">
                      {formatDate(event.startsAt)} · {event.category}
                    </p>
                  </div>
                  {status ? (
                    <Badge
                      tone={
                        status === "present"
                          ? "success"
                          : status === "excused"
                            ? "gold"
                            : "neutral"
                      }
                    >
                      {status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-charcoal/40">Not marked</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
