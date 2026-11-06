import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  hasPermission,
  requirePermission,
} from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getMemberDetail } from "@/lib/admin/members";
import { mediaUrl } from "@/lib/media";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { Avatar, Badge, SectionHeader } from "@/components/ui/display";
import { AdminMemberActions } from "@/components/admin/member-actions";

export const metadata: Metadata = { title: "Member record" };
export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission(
    PERMISSIONS.memberReview,
    "/admin/members",
  );
  const { id } = await params;
  const detail = await getMemberDetail(id);
  if (!detail) notFound();

  const { user, profile, requestedDepartment, worshipCenter } = detail;
  const currentMembership = detail.memberships.find(
    (membership) =>
      membership.isActive &&
      membership.departmentId === profile.requestedDepartmentId,
  );
  const isLeader = currentMembership?.role === "leader";

  return (
    <div className="space-y-5">
      <Link
        href="/admin/members"
        prefetch
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:underline active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to members
      </Link>

      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
        <div className="h-24 bg-brand-gradient sm:h-32" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-3">
              <Avatar
                name={user.name}
                src={mediaUrl(profile.avatarKey)}
                size="xl"
                className="border-4 border-white shadow-lift"
              />
              <div className="pb-1">
                <h1 className="font-serif text-2xl font-bold">{user.name}</h1>
                <p className="text-sm text-charcoal/55">
                  {profile.memberCode} ·{" "}
                  {requestedDepartment?.name ?? "No department assigned"}
                  {" · "}
                  {worshipCenter?.name ?? "No worship center"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    tone={
                      profile.registrationStatus === "approved"
                        ? "success"
                        : profile.registrationStatus === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {profile.registrationStatus}
                  </Badge>
                  <Badge tone={profile.memberStatus === "active" ? "brand" : "neutral"}>
                    {profile.memberStatus}
                  </Badge>
                  {isLeader ? <Badge tone="gold">Unit leader</Badge> : null}
                </div>
              </div>
            </div>
            <p className="pb-1 text-xs text-charcoal/45">
              Registered {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <section className="surface p-5 sm:p-6">
            <SectionHeader title="Contact details" className="mb-4" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Email
                </dt>
                <dd className="mt-1 flex items-center gap-2 break-all text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <a href={`mailto:${user.email}`} className="hover:underline">
                    {user.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Phone
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <a href={`tel:${user.phone}`} className="hover:underline">
                    {user.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Address
                </dt>
                <dd className="mt-1 flex items-start gap-2 text-sm text-charcoal/75">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  {profile.address || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Occupation
                </dt>
                <dd className="mt-1 text-sm text-charcoal/75">
                  {profile.occupation || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Gender
                </dt>
                <dd className="mt-1 text-sm text-charcoal/75">
                  {profile.gender ? humanize(profile.gender) : "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Date of birth
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-charcoal/75">
                  <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  {formatDate(profile.dateOfBirth)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Marital status
                </dt>
                <dd className="mt-1 text-sm text-charcoal/75">
                  {profile.maritalStatus ? humanize(profile.maritalStatus) : "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Worship center
                </dt>
                <dd className="mt-1 text-sm text-charcoal/75">
                  {worshipCenter?.name ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  State / LGA
                </dt>
                <dd className="mt-1 text-sm text-charcoal/75">
                  {[profile.state, profile.lga].filter(Boolean).join(" · ") ||
                    "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Country
                </dt>
                <dd className="mt-1 text-sm text-charcoal/75">
                  {profile.country || "Not provided"}
                </dd>
              </div>
            </dl>
            {profile.bio ? (
              <p className="mt-4 rounded-2xl bg-brand-50/70 p-4 text-sm leading-6 text-charcoal/70">
                {profile.bio}
              </p>
            ) : null}
          </section>

          <section className="surface p-5 sm:p-6">
            <SectionHeader title="Departments & roles" className="mb-4" />
            <div className="space-y-2">
              {detail.memberships.length ? (
                detail.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-brand-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{membership.departmentName}</p>
                      <p className="text-xs text-charcoal/50">
                        Joined {formatDate(membership.joinedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge tone={membership.isActive ? "brand" : "neutral"}>
                        {membership.isActive ? "active" : "inactive"}
                      </Badge>
                      <Badge tone={membership.role === "leader" ? "gold" : "neutral"}>
                        {membership.role}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-brand-200 px-4 py-5 text-sm text-charcoal/55">
                  No department memberships yet.
                </p>
              )}
            </div>

            <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Account roles
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detail.roles.length ? (
                detail.roles.map((role) => (
                  <Badge key={role.key} tone="brand">
                    {role.label}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-charcoal/55">No assigned roles</span>
              )}
            </div>

            {detail.leaderHistory.length ? (
              <>
                <h3 className="mt-5 text-sm font-semibold">Leadership history</h3>
                <ol className="mt-2 space-y-2">
                  {detail.leaderHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl bg-brand-50/60 px-4 py-3 text-sm"
                    >
                      <p className="font-semibold">{entry.departmentName}</p>
                      <p className="text-xs text-charcoal/55">
                        {formatDate(entry.startedAt)} –{" "}
                        {entry.endedAt ? formatDate(entry.endedAt) : "present"}
                      </p>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </section>

          <section className="surface p-5 sm:p-6">
            <SectionHeader title="Audit trail" className="mb-4" />
            {detail.audit.length ? (
              <ol className="space-y-3">
                {detail.audit.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-brand-200 pl-3">
                    <p className="text-sm font-semibold">{humanize(entry.action)}</p>
                    {entry.details ? (
                      <p className="text-xs leading-5 text-charcoal/60">
                        {entry.details}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-charcoal/40">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-2xl border border-dashed border-brand-200 px-4 py-5 text-sm text-charcoal/55">
                No audit entries for this member yet.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <AdminMemberActions
            memberId={user.id}
            memberName={user.name}
            registrationStatus={profile.registrationStatus}
            memberStatus={profile.memberStatus}
            followupStatus={profile.followupStatus}
            followupNotes={profile.followupNotes ?? ""}
            departmentId={profile.requestedDepartmentId}
            departmentName={requestedDepartment?.name ?? null}
            isLeader={Boolean(isLeader)}
            departments={detail.departments}
            can={{
              review: hasPermission(admin, PERMISSIONS.memberReview),
              manage: hasPermission(admin, PERMISSIONS.memberManage),
              leader: hasPermission(admin, PERMISSIONS.memberLeader),
              followup: hasPermission(admin, PERMISSIONS.memberFollowup),
              whatsapp: hasPermission(admin, PERMISSIONS.memberWhatsapp),
            }}
          />

          <div className="surface p-5 text-sm leading-6 text-charcoal/60">
            <p className="font-semibold text-charcoal">Follow-up notes</p>
            <p className="mt-1 whitespace-pre-line">
              {profile.followupNotes || "No follow-up notes yet."}
            </p>
            <p className="mt-2 text-xs text-charcoal/40">
              Status: {humanize(profile.followupStatus)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
