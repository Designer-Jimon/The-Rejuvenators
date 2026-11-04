import Link from "next/link";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Mic2,
  Sparkles,
  Users,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { departments, events, sermons } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHero,
  SectionHeader,
  Badge,
} from "@/components/ui/display";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const [settings, departmentList, upcomingEvents, latestSermons] =
    await Promise.all([
      getSettings(),
      db
        .select()
        .from(departments)
        .where(eq(departments.isActive, true))
        .orderBy(asc(departments.sortOrder))
        .limit(6),
      db
        .select()
        .from(events)
        .where(and(eq(events.isPublished, true), gte(events.startsAt, new Date())))
        .orderBy(asc(events.startsAt))
        .limit(3),
      db
        .select()
        .from(sermons)
        .where(eq(sermons.isPublished, true))
        .orderBy(desc(sermons.preachedAt))
        .limit(3),
    ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHero
        eyebrow="IT IS FINISHED REVIVAL OUTREACH"
        title={settings.hero_headline}
        description={settings.hero_subheadline}
        actions={
          <>
            <Link href="/register">
              <Button variant="gold">Join the family</Button>
            </Link>
            <Link href="/departments">
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                Find your place
              </Button>
            </Link>
          </>
        }
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: CalendarDays, label: "Sunday", value: settings.service_sunday },
          { icon: Clock3, label: "Midweek", value: settings.service_weekday },
          { icon: MapPin, label: "Location", value: settings.address },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="surface flex items-start gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-charcoal/80">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <SectionHeader
            eyebrow="Welcome"
            title={settings.welcome_title}
            description={settings.welcome_body}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-200/60 text-gold-500">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-serif text-lg font-semibold">Revival</h3>
              <p className="mt-1 text-sm leading-6 text-charcoal/65">
                A church family pursuing genuine encounter with God.
              </p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-serif text-lg font-semibold">Belonging</h3>
              <p className="mt-1 text-sm leading-6 text-charcoal/65">
                Grow in community and serve shoulder to shoulder.
              </p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">
            Led by
          </p>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            {settings.pastor_name}
          </p>
          <p className="mt-3 text-sm leading-7 text-cream/80">
            We are a family of believers committed to worship, the Word and
            practical service. There is room for you at the table.
          </p>
          <Link
            href="/about"
            className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-gold-200 hover:underline"
          >
            Learn about the church
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Serve"
          title="Departments"
          description="Discover the teams that make ministry happen and request to join one."
          action={
            <Link href="/departments">
              <Button variant="outline" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departmentList.map((department) => (
            <div
              key={department.id}
              className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200"
            >
              <Badge tone="brand">Department</Badge>
              <h3 className="mt-3 font-serif text-lg font-semibold">
                {department.name}
              </h3>
              <p className="mt-1 text-sm leading-6 text-charcoal/65">
                {department.description || "Details will be added soon."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="Gather"
            title="Upcoming events"
            action={
              <Link href="/events">
                <Button variant="outline" size="sm">
                  All events
                </Button>
              </Link>
            }
          />
          {upcomingEvents.length ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="surface p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    {formatDate(event.startsAt)}
                  </p>
                  <h3 className="mt-1 font-serif text-lg font-semibold">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-charcoal/65">
                    {event.location || "Location to be confirmed"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
              title="No events published yet"
              description="Upcoming events will appear here once the admin team publishes them."
            />
          )}
        </div>
        <div>
          <SectionHeader
            eyebrow="Listen"
            title="Latest sermons"
            action={
              <Link href="/sermons">
                <Button variant="outline" size="sm">
                  All sermons
                </Button>
              </Link>
            }
          />
          {latestSermons.length ? (
            <div className="space-y-3">
              {latestSermons.map((sermon) => (
                <div key={sermon.id} className="surface p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    {formatDate(sermon.preachedAt)}
                  </p>
                  <h3 className="mt-1 font-serif text-lg font-semibold">
                    {sermon.title}
                  </h3>
                  <p className="mt-1 text-sm text-charcoal/65">
                    {sermon.speaker || "Speaker to be confirmed"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Mic2 className="h-6 w-6" aria-hidden="true" />}
              title="Sermons coming soon"
              description="Published sermons and messages will appear here."
            />
          )}
        </div>
      </section>

      <section className="mt-12 overflow-hidden rounded-3xl bg-charcoal px-6 py-10 text-center text-cream sm:px-10">
        <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">
          Your place is waiting
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-cream/70">
          Create a member account to stay connected, request a department and
          follow church life.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/register">
            <Button variant="gold" className="w-full sm:w-auto">
              Register as a member
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 sm:w-auto"
            >
              Contact the church
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
