import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { hasPermission, requireAdmin } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getAdminCounts, listMembers } from "@/lib/admin/members";
import { formatDateTime, humanize } from "@/lib/utils";
import { Avatar, Badge, SectionHeader, StatCard } from "@/components/ui/display";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await requireAdmin();
  const canMembership = hasPermission(user, PERMISSIONS.memberReview);

  if (!canMembership) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Church office
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Your account manages site content and church information. Membership
            records are handled by the membership team.
          </p>
        </div>

        <section className="surface p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Settings className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold">Site settings</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-charcoal/60">
                Update the church name, service times, contact details and social
                links shown across the public website.
              </p>
              <Link href="/admin/settings" prefetch className="mt-4 inline-block">
                <Button>
                  Manage site settings
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <p className="text-xs text-charcoal/45">
          Signed in as {user.name}. Content management tools arrive in a later
          phase.
        </p>
      </div>
    );
  }

  const db = await getDb();
  const [counts, pending, recentAudit] = await Promise.all([
    getAdminCounts(),
    listMembers({ status: "pending", limit: 5 }),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Membership office
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Overview</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Review registrations, manage the family and keep church details current.
          </p>
        </div>
        <Link href="/admin/members" prefetch>
          <Button>
            Open membership
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending review"
          value={counts.pending}
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          tone="gold"
        />
        <StatCard
          label="Approved"
          value={counts.approved}
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          tone="green"
        />
        <StatCard
          label="Active members"
          value={counts.active}
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Departments"
          value={counts.departments}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          tone="charcoal"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Awaiting review"
            description="Newest registrations that need a membership decision."
            action={
              <Link href="/admin/members?status=pending" prefetch>
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
            className="mb-4"
          />

          {pending.length ? (
            <div className="space-y-2">
              {pending.map((member) => (
                <Link
                  key={member.id}
                  href={`/admin/members/${member.id}`}
                  prefetch
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-brand-100 p-3 transition hover:bg-brand-50/60 active:scale-[0.99] active:opacity-80"
                >
                  <Avatar
                    name={member.name}
                    src={member.avatarKey ? `/api/media/${member.avatarKey}` : null}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{member.name}</p>
                    <p className="truncate text-xs text-charcoal/55">
                      {member.departmentName ?? "No department"} ·{" "}
                      {formatDateTime(member.createdAt)}
                    </p>
                  </div>
                  <Badge tone="warning">Pending</Badge>
                  <ArrowRight className="h-4 w-4 text-charcoal/30" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-200 px-4 py-8 text-center text-sm text-charcoal/55">
              No registrations are waiting for review.
            </p>
          )}
        </section>

        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Recent activity"
            description="The latest membership actions recorded in the audit trail."
            className="mb-4"
          />
          {recentAudit.length ? (
            <ol className="space-y-3">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-sm font-semibold">{humanize(entry.action)}</p>
                  {entry.details ? (
                    <p className="mt-0.5 text-xs leading-5 text-charcoal/60">
                      {entry.details}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-charcoal/40">
                    {entry.actorName ?? "System"} · {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-200 px-4 py-8 text-center text-sm text-charcoal/55">
              No admin activity has been recorded yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
