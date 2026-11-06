import type { Metadata } from "next";
import Image from "next/image";
import { and, asc, eq, gte } from "drizzle-orm";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { getDb } from "@/lib/db";
import { eventDepartments, events } from "@/lib/db/schema";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHero } from "@/components/ui/display";

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
  const [list, links] = await Promise.all([
    db
      .select()
      .from(events)
      .where(and(eq(events.isPublished, true), gte(events.startsAt, new Date())))
      .orderBy(asc(events.startsAt)),
    db
      .select({ eventId: eventDepartments.eventId })
      .from(eventDepartments),
  ]);
  const participating = new Set(links.map((link) => link.eventId));

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
                      {formatDate(event.startsAt)}
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
