import type { Metadata } from "next";
import Image from "next/image";
import { and, asc, eq, gte, or } from "drizzle-orm";
import { CalendarDays, Clock3, MapPin, Radio } from "lucide-react";
import { getDb } from "@/lib/db";
import {
  eventCenters,
  eventDepartments,
  eventLiveLinks,
  events,
  eventSessions,
  worshipCenters,
} from "@/lib/db/schema";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHero } from "@/components/ui/display";
import { LiveCountdown } from "@/components/public/live-countdown";

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

export default async function EventsPage() {
  const db = await getDb();
  const now = new Date();
  const [list, links, centerLinks, sessionList, liveLinks] = await Promise.all([
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.isPublished, true),
          or(gte(events.startsAt, now), gte(events.endsAt, now)),
        ),
      )
      .orderBy(asc(events.startsAt)),
    db
      .select({ eventId: eventDepartments.eventId })
      .from(eventDepartments),
    db
      .select({
        eventId: eventCenters.eventId,
        name: worshipCenters.name,
      })
      .from(eventCenters)
      .innerJoin(worshipCenters, eq(worshipCenters.id, eventCenters.centerId)),
    db
      .select()
      .from(eventSessions)
      .orderBy(asc(eventSessions.startsAt), asc(eventSessions.sortOrder)),
    db
      .select()
      .from(eventLiveLinks)
      .where(eq(eventLiveLinks.isActive, true))
      .orderBy(asc(eventLiveLinks.sortOrder)),
  ]);
  const participating = new Set(links.map((link) => link.eventId));
  const centersByEvent = new Map<string, string[]>();
  for (const link of centerLinks) {
    centersByEvent.set(link.eventId, [
      ...(centersByEvent.get(link.eventId) ?? []),
      link.name,
    ]);
  }
  const sessionsByEvent = new Map<string, typeof sessionList>();
  for (const session of sessionList) {
    sessionsByEvent.set(session.eventId, [
      ...(sessionsByEvent.get(session.eventId) ?? []),
      session,
    ]);
  }
  const liveLinksByEvent = new Map<string, typeof liveLinks>();
  for (const link of liveLinks) {
    liveLinksByEvent.set(link.eventId, [
      ...(liveLinksByEvent.get(link.eventId) ?? []),
      link,
    ]);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Gather"
        title="Church events"
        description="Special services, outreaches and gatherings. Events published by the church team appear here."
      />

      <div className="content-auto mt-8">
        {list.length ? (
          <div className="space-y-4">
            {list.map((event) => (
              <article key={event.id} className="surface overflow-hidden">
                {event.coverKey ? (
                  <div className="relative aspect-[16/8] bg-brand-50">
                    <Image
                      src={publicMediaUrl(event.coverKey) ?? ""}
                      alt={event.title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 896px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1">
                      {event.category}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {event.durationDays > 1 && event.endsAt
                        ? `${formatDate(event.startsAt)} – ${formatDate(event.endsAt)}`
                        : formatDate(event.startsAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-charcoal/50">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      {event.endsAt
                        ? `${lagosTime(event.startsAt)} – ${lagosTime(event.endsAt)}`
                        : lagosTime(event.startsAt)}
                    </span>
                    {event.location ? (
                      <span className="inline-flex items-center gap-1 text-charcoal/50">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {event.location}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-serif text-2xl font-semibold">
                    {event.title}
                  </h2>
                  <LiveCountdown
                    startsAt={event.startsAt.toISOString()}
                    endsAt={event.endsAt?.toISOString() ?? null}
                    className="mt-2"
                  />
                  {(centersByEvent.get(event.id) ?? []).length ? (
                    <p className="mt-2 text-xs font-semibold text-charcoal/50">
                      {(centersByEvent.get(event.id) ?? []).join(" · ")}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-charcoal/70">
                      {event.description}
                    </p>
                  ) : null}
                  {event.instructions ? (
                    <p className="mt-3 whitespace-pre-line rounded-2xl bg-brand-50/70 p-4 text-sm leading-6 text-charcoal/70">
                      {event.instructions}
                    </p>
                  ) : null}
                  {(sessionsByEvent.get(event.id) ?? []).length ? (
                    <div className="mt-4 rounded-2xl border border-brand-100 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                        Programme
                      </p>
                      <ul className="mt-2 space-y-2">
                        {(sessionsByEvent.get(event.id) ?? []).map((session) => (
                          <li
                            key={session.id}
                            className="flex flex-wrap items-baseline justify-between gap-1 text-sm"
                          >
                            <span className="font-semibold text-charcoal/80">
                              {session.title}
                            </span>
                            <span className="text-xs text-charcoal/55">
                              {formatDate(session.startsAt)} ·{" "}
                              {lagosTime(session.startsAt)}
                              {session.endsAt
                                ? ` – ${lagosTime(session.endsAt)}`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {(liveLinksByEvent.get(event.id) ?? []).length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(liveLinksByEvent.get(event.id) ?? []).map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonClasses("gold", "sm")}
                        >
                          <Radio className="h-4 w-4" aria-hidden="true" />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {participating.has(event.id) ? (
                    <p className="mt-3 text-xs text-charcoal/45">
                      Department participation is listed in the member area.
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
            title="No events published yet"
            description="When the church team publishes an event, it will show here with the date, time and location."
          />
        )}
      </div>
    </div>
  );
}
