import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { listMembers, type MemberListItem } from "@/lib/admin/members";
import { formatDate, humanize } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { Avatar, Badge, ResponsiveTable } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function statusTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requirePermission(
    PERMISSIONS.memberReview,
    "/admin/members",
  );
  const params = await searchParams;
  const status = tabs.some((tab) => tab.key === params.status)
    ? params.status!
    : "all";
  const search = (params.q ?? "").trim().slice(0, 80);

  const members = await listMembers({ status, search, limit: 150 });

  const columns = [
    {
      key: "member",
      header: "Member",
      render: (member: MemberListItem) => (
        <Link
          href={`/admin/members/${member.id}`}
          className="flex min-h-11 items-center gap-3 font-semibold text-charcoal hover:text-brand-800"
        >
          <Avatar
            name={member.name}
            src={mediaUrl(member.avatarKey)}
            size="sm"
          />
          <span>
            <span className="block">{member.name}</span>
            <span className="block text-xs font-normal text-charcoal/45">
              {member.memberCode}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Registration",
      render: (member: MemberListItem) => (
        <Badge tone={statusTone(member.registrationStatus)}>
          {member.registrationStatus}
        </Badge>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (member: MemberListItem) => member.departmentName ?? "Not assigned",
    },
    {
      key: "followup",
      header: "Follow-up",
      render: (member: MemberListItem) => humanize(member.followupStatus),
    },
    {
      key: "registered",
      header: "Registered",
      render: (member: MemberListItem) => formatDate(member.createdAt),
    },
    {
      key: "open",
      header: "",
      render: (member: MemberListItem) => (
        <Link
          href={`/admin/members/${member.id}`}
          className="font-semibold text-brand-800 hover:underline"
        >
          Open
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Membership
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Members</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Review registrations, assign departments and manage follow-up.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/members?status=${tab.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-2xl border px-4 text-sm font-semibold transition",
              status === tab.key
                ? "border-brand-700 bg-brand-700 text-cream"
                : "border-brand-200 bg-white text-charcoal/70 hover:border-brand-400",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form
        action="/admin/members"
        method="get"
        className="flex flex-col gap-2 rounded-2xl border border-brand-100 bg-white p-3 shadow-soft sm:flex-row"
      >
        <input type="hidden" name="status" value={status} />
        <label htmlFor="member-search" className="sr-only">
          Search members
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40"
            aria-hidden="true"
          />
          <Input
            id="member-search"
            name="q"
            defaultValue={search}
            placeholder="Search name, email, phone or member ID"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <p className="text-sm text-charcoal/55">
        Showing {members.length} {members.length === 1 ? "member" : "members"}.
      </p>

      <ResponsiveTable
        rows={members}
        columns={columns}
        rowKey={(member) => member.id}
        caption={`Membership records, ${status} filter`}
        empty={
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 px-6 py-12 text-center">
            <p className="font-serif text-lg font-semibold">No members found</p>
            <p className="mt-1 text-sm text-charcoal/55">
              Try a different filter or search term.
            </p>
          </div>
        }
      />

      <p className="text-xs text-charcoal/40">
        Signed in as {user.name}. Membership decisions are recorded in the audit
        log.
      </p>
    </div>
  );
}
