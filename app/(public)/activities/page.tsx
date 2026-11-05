import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { getDb } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { parseActivitySchedule } from "@/lib/content";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge, EmptyState, PageHero, SectionHeader } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activities",
  description:
    "Weekly services, prayer meetings, Bible study and special revival programs at IT IS FINISHED REVIVAL OUTREACH.",
  openGraph: {
    title: "Activities | IT IS FINISHED REVIVAL OUTREACH",
    description:
      "Weekly services, prayer meetings, Bible study and special revival programs.",
    type: "website",
  },
};

export default async function ActivitiesPage() {
  const db = await getDb();
  const [settings, list] = await Promise.all([
    getSettings(),
    db
      .select()
      .from(activities)
      .where(eq(activities.isPublished, true))
      .orderBy(asc(activities.activityDate)),
  ]);

  const scheduled = list.map((activity) => ({
    activity,
    schedule: parseActivitySchedule(activity.description),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Activities"
        title="Our weekly rhythm and special gatherings"
        description={`Come and be part of what God is doing at ${settings.church_name}.`}
      />

      <section className="mt-10">
        <SectionHeader
          eyebrow="Weekly schedule"
          title="Gather with us"
          description="Days, times and venues are editable by the church team in the admin dashboard."
        />
        {scheduled.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduled.map(({ activity, schedule }) => (
              <article key={activity.id} className="surface p-5">
                <Badge tone="brand">{schedule.day || "Weekly"}</Badge>
                <h3 className="mt-3 font-serif text-xl font-semibold">
                  {activity.title}
                </h3>
                <dl className="mt-3 space-y-2 text-sm text-charcoal/70">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Day</dt>
                      <dd>{schedule.day || "Day to be confirmed"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Time</dt>
                      <dd>{schedule.time || "Time to be confirmed"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Venue</dt>
                      <dd>{schedule.venue || settings.address}</dd>
                    </div>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
            title="Activities coming soon"
            description="The church team is preparing the weekly schedule."
          />
        )}
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="What to expect"
          title="Every gathering"
          description="A place for worship, the Word, prayer and fellowship."
        />
        {scheduled.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {scheduled.map(({ activity, schedule }) => (
              <article key={activity.id} className="surface p-5 sm:p-6">
                <h3 className="font-serif text-xl font-semibold">
                  {activity.title}
                </h3>
                {schedule.summary ? (
                  <p className="mt-2 text-base leading-7 text-charcoal/70">
                    {schedule.summary}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-charcoal/50">
                  {activity.activityDate
                    ? formatDate(activity.activityDate)
                    : "Weekly gathering"}
                  {activity.location ? ` - ${activity.location}` : ""}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-12 rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift sm:p-8">
        <h2 className="font-serif text-2xl font-bold text-white">
          New to the church?
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-cream/85">
          Let us know you are coming. We will help you find your way around and
          connect with the right department.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/contact"
            className={buttonClasses("gold", "lg", "w-full sm:w-auto")}
          >
            Contact the church
          </Link>
          <Link
            href="/register"
            className={buttonClasses(
              "outline",
              "lg",
              "w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto",
            )}
          >
            Join our church family
          </Link>
        </div>
      </section>
    </div>
  );
}
