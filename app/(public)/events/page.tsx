import type { Metadata } from "next";
import { and, asc, eq, gte } from "drizzle-orm";
import { CalendarDays, MapPin } from "lucide-react";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EmptyState, PageHero } from "@/components/ui/display";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const db = await getDb();
  const list = await db
    .select()
    .from(events)
    .where(and(eq(events.isPublished, true), gte(events.startsAt, new Date())))
    .orderBy(asc(events.startsAt));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Gather"
        title="Church events"
        description="Special services, outreaches and gatherings. Events published by the church team appear here."
      />

      <div className="mt-8">
        {list.length ? (
          <div className="space-y-4">
            {list.map((event) => (
              <article key={event.id} className="surface p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {formatDate(event.startsAt)}
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
                <p className="mt-3 text-xs text-charcoal/45">
                  Starts {formatDateTime(event.startsAt)}
                </p>
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
