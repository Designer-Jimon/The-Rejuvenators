import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell, CheckCheck } from "lucide-react";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { formatDateTime, humanize } from "@/lib/utils";
import { Badge, EmptyState, PageHero } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "../actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser("/member/notifications");
  const db = await getDb();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(80);

  const unread = rows.filter((row) => !row.isRead).length;

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Stay informed"
        title="Notifications"
        description="Registration decisions, leadership updates and church announcements appear here."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-charcoal/60">
          {unread ? (
            <span className="font-semibold text-brand-800">{unread} unread</span>
          ) : (
            "You are all caught up."
          )}
        </p>
        {unread ? (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      {rows.length ? (
        <div className="space-y-2">
          {rows.map((notification) => {
            const content = (
              <div
                className={
                  notification.isRead
                    ? "rounded-2xl border border-brand-100 bg-white p-4 shadow-soft"
                    : "rounded-2xl border border-brand-200 bg-brand-50/70 p-4 shadow-soft"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={notification.isRead ? "neutral" : "brand"}>
                        {humanize(notification.type)}
                      </Badge>
                      {!notification.isRead ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-brand-700" />
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-serif text-lg font-semibold">
                      {notification.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-charcoal/65">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-charcoal/40">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <Bell
                    className="mt-1 h-5 w-5 shrink-0 text-brand-700/50"
                    aria-hidden="true"
                  />
                </div>
              </div>
            );

            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
              >
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="h-6 w-6" aria-hidden="true" />}
          title="No notifications yet"
          description="When there is an update about your membership or the church, it will show up here."
        />
      )}
    </div>
  );
}
