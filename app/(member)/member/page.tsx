import Link from "next/link";
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Users,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  departmentLeaders,
  departmentMembers,
  departments,
  events,
  notifications,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { getMemberAttendanceStats } from "@/lib/attendance";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  ProgressRing,
  SectionHeader,
  StatCard,
} from "@/components/ui/display";
import { NotificationLink } from "@/components/notifications/notification-link";

export const dynamic = "force-dynamic";

export default async function MemberHomePage() {
  const user = await requireUser("/member");
  const db = await getDb();

  const [
    memberships,
    recentNotifications,
    upcoming,
    attendance,
    ledDepartments,
  ] = await Promise.all([
    db
      .select({
        id: departmentMembers.id,
        name: departments.name,
        role: departmentMembers.role,
        joinedAt: departmentMembers.joinedAt,
      })
      .from(departmentMembers)
      .innerJoin(departments, eq(departments.id, departmentMembers.departmentId))
      .where(
        and(
          eq(departmentMembers.userId, user.id),
          eq(departmentMembers.isActive, true),
        ),
      )
      .orderBy(desc(departmentMembers.joinedAt)),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(3),
    db
      .select()
      .from(events)
      .where(and(eq(events.isPublished, true), gte(events.startsAt, new Date())))
      .orderBy(asc(events.startsAt))
      .limit(2),
    getMemberAttendanceStats(user.id),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departmentLeaders)
      .innerJoin(departments, eq(departments.id, departmentLeaders.departmentId))
      .where(
        and(
          eq(departmentLeaders.userId, user.id),
          isNull(departmentLeaders.endedAt),
          eq(departments.isActive, true),
        ),
      ),
  ]);

  const pending = user.profile.registrationStatus !== "approved";
  const profileFields = [
    user.profile.bio,
    user.profile.address,
    user.profile.occupation,
    user.profile.gender,
    user.profile.dateOfBirth,
    user.profile.avatarKey,
  ];
  const completeness = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100,
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand-gradient p-5 text-cream shadow-lift sm:p-7">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">
            Member dashboard
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white sm:text-4xl">
            Welcome, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-cream/80">
            {pending
              ? "Your registration is being reviewed by the membership team. You can complete your profile while you wait."
              : "Stay connected with the family, keep your profile fresh and see what is coming up."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="gold">
              {user.profile.registrationStatus ?? "pending"}
            </Badge>
            <Badge tone="warning">{user.profile.memberStatus ?? "inactive"}</Badge>
            <span className="text-xs font-semibold text-cream/75">
              {user.profile.memberCode ?? "Member ID pending"}
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/15" />
      </section>

      {pending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Registration status: {user.profile.registrationStatus}</p>
          <p className="mt-1 text-amber-900/75">
            A membership admin will review your request. You will receive an
            in-app notification when a decision is made.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Member ID"
          value={user.profile.memberCode ?? "Pending"}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Department"
          value={
            <span className="text-xl">
              {user.profile.requestedDepartmentName ?? "General"}
            </span>
          }
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          tone="gold"
        />
        <StatCard
          label="Member since"
          value={
            <span className="text-xl">
              {formatDate(user.profile.createdAt)}
            </span>
          }
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          tone="success"
        />
        <StatCard
          label="Unread alerts"
          value={user.unreadNotifications}
          icon={<Bell className="h-5 w-5" aria-hidden="true" />}
          tone="neutral"
        />
      </section>

      {ledDepartments.length ? (
        <section className="surface flex flex-wrap items-center justify-between gap-4 border-brand-700/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-cream">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                Unit leader
              </p>
              <h2 className="mt-1 font-serif text-lg font-semibold">
                Mark attendance
              </h2>
              <p className="mt-1 text-sm text-charcoal/60">
                {ledDepartments.map((row) => row.name).join(" · ")}
              </p>
            </div>
          </div>
          <Link href="/member/events" prefetch>
            <Button variant="outline" size="sm">
              Open events
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </section>
      ) : null}

      <section className="surface p-5 sm:p-6">
        <SectionHeader
          title="Attendance"
          description="Your recorded attendance across church gatherings."
          action={
            <Link href="/member/events" prefetch>
              <Button variant="outline" size="sm">
                Open events
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          }
          className="mb-4"
        />
        <div className="flex flex-wrap items-center gap-5">
          <ProgressRing
            value={attendance.percentage}
            label="Attendance rate"
          />
          <div className="grid flex-1 grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-50 p-3 text-center">
              <p className="font-serif text-2xl font-bold text-emerald-800">
                {attendance.overall}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800/70">
                Present
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3 text-center">
              <p className="font-serif text-2xl font-bold text-brand-800">
                {attendance.sunday}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-800/70">
                Sunday
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-center">
              <p className="font-serif text-2xl font-bold text-amber-800">
                {attendance.midweek}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">
                Midweek
              </p>
            </div>
          </div>
          <ClipboardCheck
            className="hidden h-10 w-10 shrink-0 text-brand-200 sm:block"
            aria-hidden="true"
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Your profile"
            description="A complete profile helps the church family know and support you."
            className="mb-4"
          />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-50 p-4">
            <ProgressRing value={completeness} label="Profile completeness" />
            <Link href="/member/profile" prefetch>
              <Button variant="outline" size="sm">
                Complete profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-charcoal">My departments</h3>
            {memberships.length ? (
              <div className="mt-2 space-y-2">
                {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-brand-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{membership.name}</p>
                      <p className="text-xs text-charcoal/50">
                        Joined {formatDate(membership.joinedAt)}
                      </p>
                    </div>
                    <Badge tone={membership.role === "leader" ? "gold" : "brand"}>
                      {membership.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-2xl border border-dashed border-brand-200 px-4 py-5 text-sm text-charcoal/55">
                No department assigned yet. Your requested department is shown
                above and will be confirmed by an admin.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold">Recent alerts</h2>
              <Link
                href="/member/notifications"
                prefetch
                className="text-xs font-semibold text-brand-800 hover:underline active:opacity-70"
              >
                View all
              </Link>
            </div>
            {recentNotifications.length ? (
              <div className="mt-3 space-y-2">
                {recentNotifications.map((notification) => (
                  <NotificationLink
                    key={notification.id}
                    id={notification.id}
                    href={notification.link ?? "/member/notifications"}
                    isRead={notification.isRead}
                    className="block rounded-2xl border border-brand-100 p-3 transition hover:bg-brand-50/50 active:scale-[0.99] active:opacity-80"
                  >
                    <p className="text-sm font-semibold">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-charcoal/60">
                      {notification.body}
                    </p>
                  </NotificationLink>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-charcoal/55">No notifications yet.</p>
            )}
          </section>

          <section className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold">Upcoming</h2>
              <Link
                href="/member/events"
                prefetch
                className="text-xs font-semibold text-brand-800 hover:underline active:opacity-70"
              >
                View events
              </Link>
            </div>
            {upcoming.length ? (
              <div className="mt-3 space-y-2">
                {upcoming.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-brand-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                      {formatDate(event.startsAt)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{event.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No events yet"
                description="Upcoming events will appear here."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
