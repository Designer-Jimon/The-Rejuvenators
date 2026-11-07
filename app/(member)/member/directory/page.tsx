import type { Metadata } from "next";
import { and, desc, eq, like, or } from "drizzle-orm";
import { Mail, Phone, Search, Users } from "lucide-react";
import { getDb } from "@/lib/db";
import {
  departments,
  memberProfiles,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { Avatar, Badge, EmptyState, PageHero } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { MessageMemberButton } from "@/components/member/message-member-button";

export const metadata: Metadata = { title: "Member directory" };
export const dynamic = "force-dynamic";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser("/member/directory");
  const { q } = await searchParams;
  const search = (q ?? "").trim().slice(0, 80);
  const db = await getDb();

  const filters = [
    eq(memberProfiles.registrationStatus, "approved"),
    eq(users.status, "active"),
  ];
  if (search) {
    const term = `%${search.replace(/[%_]/g, "")}%`;
    filters.push(
      or(
        like(users.name, term),
        like(memberProfiles.memberCode, term),
        like(memberProfiles.occupation, term),
      )!,
    );
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      memberCode: memberProfiles.memberCode,
      occupation: memberProfiles.occupation,
      bio: memberProfiles.bio,
      avatarKey: memberProfiles.avatarKey,
      gender: memberProfiles.gender,
      showPhone: memberProfiles.showPhone,
      showEmail: memberProfiles.showEmail,
      createdAt: memberProfiles.createdAt,
      departmentName: departments.name,
    })
    .from(users)
    .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(departments, eq(departments.id, memberProfiles.requestedDepartmentId))
    .where(and(...filters))
    .orderBy(desc(memberProfiles.createdAt))
    .limit(60);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="The family"
        title="Member directory"
        description="Connect with the IT IS FINISHED REVIVAL OUTREACH family. Contact details appear only when a member chooses to share them."
      />

      <form
        action="/member/directory"
        method="get"
        className="flex flex-col gap-2 rounded-2xl border border-brand-100 bg-white p-3 shadow-soft sm:flex-row"
      >
        <label htmlFor="directory-search" className="sr-only">
          Search members
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40"
            aria-hidden="true"
          />
          <Input
            id="directory-search"
            name="q"
            defaultValue={search}
            placeholder="Search by name, member ID or occupation"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <p className="text-sm text-charcoal/55">
        {rows.length} {rows.length === 1 ? "member" : "members"} found
        {search ? ` for “${search}”` : ""}.
      </p>

      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((member) => {
            const isSelf = member.id === user.id;
            const canSeePhone = member.showPhone || isSelf;
            const canSeeEmail = member.showEmail || isSelf;
            return (
              <article
                key={member.id}
                className="flex flex-col rounded-3xl border border-brand-100 bg-white p-5 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    name={member.name}
                    src={mediaUrl(member.avatarKey)}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-serif text-lg font-semibold">
                      {member.name}
                      {isSelf ? (
                        <span className="ml-1 text-xs font-sans font-normal text-charcoal/45">
                          (you)
                        </span>
                      ) : null}
                    </h2>
                    <p className="truncate text-xs text-charcoal/55">
                      {member.memberCode}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge tone="brand">
                        {member.departmentName ?? "General Member"}
                      </Badge>
                      {member.occupation ? (
                        <Badge tone="neutral">{member.occupation}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                {member.bio ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-charcoal/65">
                    {member.bio}
                  </p>
                ) : null}

                <div className="mt-3 space-y-1.5 text-sm">
                  {canSeePhone ? (
                    <a
                      href={`tel:${member.phone}`}
                      className="flex min-h-9 items-center gap-2 text-brand-800 hover:underline"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {member.phone}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 text-charcoal/35">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      Phone kept private
                    </p>
                  )}
                  {canSeeEmail ? (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex min-h-9 items-center gap-2 break-all text-brand-800 hover:underline"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {member.email}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 text-charcoal/35">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Email kept private
                    </p>
                  )}
                </div>

                {!isSelf ? (
                  <MessageMemberButton userId={member.id} name={member.name} />
                ) : null}

                {!isSelf ? (
                  <MessageMemberButton userId={member.id} name={member.name} />
                ) : null}

                <p className="mt-auto pt-3 text-xs text-charcoal/40">
                  Member since {formatDate(member.createdAt)}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title="No members found"
          description={
            search
              ? "Try a different search, or clear the search to see everyone."
              : "Approved members will appear here as the family grows."
          }
          action={
            search ? (
              <a href="/member/directory">
                <Button variant="outline">Clear search</Button>
              </a>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
