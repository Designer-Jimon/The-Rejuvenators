import type { Metadata } from "next";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import {
  ArchiveRestore,
  BellOff,
  Flag,
  MessageCircle,
  ShieldAlert,
  Trash2,
  Volume2,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  chatReports,
  conversations,
  messages,
  users,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge, EmptyState } from "@/components/ui/display";
import { moderateChat } from "./actions";

export const metadata: Metadata = { title: "Chat moderation" };
export const dynamic = "force-dynamic";

export default async function ChatModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.memberManage, "/admin/chat-moderation");
  const { saved, error } = await searchParams;
  const db = await getDb();
  const reporterUser = alias(users, "reporter");
  const senderUser = alias(users, "sender");

  const [reports, groups, muted] = await Promise.all([
    db
      .select({
        id: chatReports.id,
        reason: chatReports.reason,
        status: chatReports.status,
        messageId: chatReports.messageId,
        conversationId: chatReports.conversationId,
        createdAt: chatReports.createdAt,
        conversationType: conversations.type,
        conversationTitle: conversations.title,
        reporterName: reporterUser.name,
        senderId: messages.senderId,
        senderName: senderUser.name,
      })
      .from(chatReports)
      .leftJoin(conversations, eq(conversations.id, chatReports.conversationId))
      .leftJoin(messages, eq(messages.id, chatReports.messageId))
      .leftJoin(reporterUser, eq(reporterUser.id, chatReports.reporterId))
      .leftJoin(senderUser, eq(senderUser.id, messages.senderId))
      .orderBy(desc(chatReports.createdAt))
      .limit(100),
    db
      .select({
        id: conversations.id,
        type: conversations.type,
        title: conversations.title,
        isArchived: conversations.isArchived,
        lastMessageAt: conversations.lastMessageAt,
        memberCount: sql<number>`(
          select count(*) from conversation_participants cp
          where cp.conversation_id = ${conversations.id}
        )`,
        messageCount: sql<number>`(
          select count(*) from messages m
          where m.conversation_id = ${conversations.id}
        )`,
      })
      .from(conversations)
      .where(inArray(conversations.type, ["department", "announcement"]))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(100),
    db
      .select({
        id: users.id,
        name: users.name,
        chatMutedUntil: users.chatMutedUntil,
      })
      .from(users)
      .where(and(gt(users.chatMutedUntil, new Date())))
      .orderBy(desc(users.chatMutedUntil))
      .limit(50),
  ]);

  const openReports = reports.filter((report) => report.status === "open");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          People
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Chat moderation</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Review reports, remove messages, mute members and manage group chats.
          Opening reported content is recorded in the audit log.
        </p>
      </div>

      {saved ? <FormMessage tone="success">{saved}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-brand-700" aria-hidden="true" />
          <h2 className="font-serif text-xl font-semibold">
            Reports ({openReports.length} open)
          </h2>
        </div>

        {reports.length ? (
          reports.map((report) => (
            <article key={report.id} className="surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={report.status === "open" ? "gold" : "success"}>
                  {report.status === "open" ? "Open" : "Closed"}
                </Badge>
                <span className="text-xs text-charcoal/45">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(report.createdAt)}
                </span>
                <span className="text-xs text-charcoal/45">
                  {report.reporterName ? `Reported by ${report.reporterName}` : "Member report"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">
                {report.conversationTitle ??
                  (report.conversationType === "direct"
                    ? "Direct message"
                    : "Group chat")}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-brand-50 px-3 py-2 text-sm leading-6 text-charcoal/75">
                {report.reason}
              </p>
              {report.senderName ? (
                <p className="mt-2 text-xs text-charcoal/50">
                  Message from <span className="font-semibold">{report.senderName}</span>
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {report.messageId ? (
                  <form action={moderateChat}>
                    <input type="hidden" name="action" value="view_message" />
                    <input type="hidden" name="messageId" value={report.messageId} />
                    <input
                      type="hidden"
                      name="conversationId"
                      value={report.conversationId}
                    />
                    <SubmitButton variant="outline" size="sm" pendingLabel="Opening...">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      View message
                    </SubmitButton>
                  </form>
                ) : null}
                {report.messageId ? (
                  <form action={moderateChat}>
                    <input type="hidden" name="action" value="delete_message" />
                    <input type="hidden" name="messageId" value={report.messageId} />
                    <input
                      type="hidden"
                      name="conversationId"
                      value={report.conversationId}
                    />
                    <SubmitButton variant="danger" size="sm" pendingLabel="Removing...">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove message
                    </SubmitButton>
                  </form>
                ) : null}
                {report.senderId ? (
                  <form action={moderateChat} className="flex items-center gap-2">
                    <input type="hidden" name="action" value="mute_user" />
                    <input type="hidden" name="userId" value={report.senderId} />
                    <select
                      name="hours"
                      defaultValue="24"
                      className="min-h-11 rounded-2xl border border-brand-200 bg-white px-3 text-sm"
                      aria-label="Mute duration"
                    >
                      <option value="1">1 hour</option>
                      <option value="24">24 hours</option>
                      <option value="168">7 days</option>
                      <option value="720">30 days</option>
                    </select>
                    <SubmitButton variant="outline" size="sm" pendingLabel="Muting...">
                      <BellOff className="h-4 w-4" aria-hidden="true" />
                      Mute sender
                    </SubmitButton>
                  </form>
                ) : null}
                <form action={moderateChat}>
                  <input type="hidden" name="action" value="resolve_report" />
                  <input type="hidden" name="reportId" value={report.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={report.status === "open" ? "closed" : "open"}
                  />
                  <SubmitButton variant="ghost" size="sm" pendingLabel="Updating...">
                    {report.status === "open" ? "Mark closed" : "Reopen"}
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />}
            title="No reports"
            description="Member reports will appear here for review."
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Group chats</h2>
        {groups.length ? (
          groups.map((group) => (
            <article
              key={group.id}
              className="surface flex flex-wrap items-center gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {group.title ?? "Group chat"}
                  </p>
                  <Badge tone={group.isArchived ? "danger" : "success"}>
                    {group.isArchived ? "Archived" : "Active"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-charcoal/50">
                  {group.type === "announcement"
                    ? "All centers announcements"
                    : "Department group"}{" "}
                  {" | "}{Number(group.memberCount)} members{" | "}{Number(group.messageCount)} messages
                  {Number(group.messageCount)} messages
                </p>
              </div>
              <form action={moderateChat}>
                <input type="hidden" name="action" value="archive_group" />
                <input type="hidden" name="conversationId" value={group.id} />
                <input
                  type="hidden"
                  name="archive"
                  value={group.isArchived ? "0" : "1"}
                />
                <SubmitButton variant="outline" size="sm" pendingLabel="Updating...">
                  <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                  {group.isArchived ? "Restore" : "Archive"}
                </SubmitButton>
              </form>
            </article>
          ))
        ) : (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" aria-hidden="true" />}
            title="No group chats"
            description="Department groups appear when members are assigned."
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Muted members</h2>
        {muted.length ? (
          muted.map((member) => (
            <article
              key={member.id}
              className="surface flex flex-wrap items-center gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="text-xs text-charcoal/50">
                  Muted until{" "}
                  {member.chatMutedUntil
                    ? new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(member.chatMutedUntil)
                    : ""}
                </p>
              </div>
              <form action={moderateChat}>
                <input type="hidden" name="action" value="unmute_user" />
                <input type="hidden" name="userId" value={member.id} />
                <SubmitButton variant="outline" size="sm" pendingLabel="Updating...">
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  Unmute
                </SubmitButton>
              </form>
            </article>
          ))
        ) : (
          <p className="surface p-4 text-sm text-charcoal/55">
            No muted members.
          </p>
        )}
      </section>
    </div>
  );
}
