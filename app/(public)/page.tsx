import Link from "next/link";
import Image from "next/image";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Cross,
  Facebook,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Youtube,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  activities,
  departments,
  devotionals,
  events,
  slideshowImages,
} from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { getBlock, getContentMap } from "@/lib/content";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  SectionHeader,
} from "@/components/ui/display";
import {
  HeroSlideshow,
  type HeroSlide,
} from "@/components/public/hero-slideshow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home",
  description:
    "IT IS FINISHED REVIVAL OUTREACH - a Christ-centred family provoking revival through worship, the Word and service.",
  openGraph: {
    title: "IT IS FINISHED REVIVAL OUTREACH",
    description:
      "A Christ-centred family provoking revival through worship, the Word and service.",
    type: "website",
  },
};

export default async function HomePage() {
  const db = await getDb();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [
    settings,
    content,
    departmentList,
    upcomingActivities,
    featuredEvents,
    slides,
    latestDevotional,
  ] = await Promise.all([
      getSettings(),
      getContentMap(),
      db
        .select()
        .from(departments)
        .where(eq(departments.isActive, true))
        .orderBy(asc(departments.sortOrder))
        .limit(6),
      db
        .select()
        .from(activities)
        .where(eq(activities.isPublished, true))
        .orderBy(asc(activities.sortOrder), asc(activities.createdAt))
        .limit(3),
      db
        .select()
        .from(events)
        .where(and(eq(events.isPublished, true), gte(events.startsAt, new Date())))
        .orderBy(asc(events.startsAt))
        .limit(3),
      db
        .select()
        .from(slideshowImages)
        .where(eq(slideshowImages.isActive, true))
        .orderBy(asc(slideshowImages.sortOrder)),
      db
        .select()
        .from(devotionals)
        .where(
          and(
            eq(devotionals.status, "published"),
            eq(devotionals.isPublished, true),
            lte(devotionals.publishDate, today),
          ),
        )
        .orderBy(desc(devotionals.publishDate))
        .limit(1),
    ]);

  const intro = getBlock(content, "intro");
  const scripture = getBlock(content, "scripture");
  const pastor = getBlock(content, "pastor_intro");
  const devotionalBlock = getBlock(content, "latest_devotional");
  const devotional = latestDevotional[0] ?? null;
  const appointment = getBlock(content, "appointment_cta");

  const heroActions = {
    primaryHref: settings.hero_primary_href || "/register",
    primaryLabel: settings.hero_primary_label || "Join Our Church Family",
    secondaryHref: settings.hero_secondary_href || "/vision-mission",
    secondaryLabel:
      settings.hero_secondary_label || "Discover Our Vision",
  };

  const heroSlides: HeroSlide[] = slides.length
    ? slides.map((slide, index) => ({
        id: slide.id,
        eyebrow: settings.church_name,
        title: slide.headline || settings.hero_headline,
        subtitle: slide.subheadline || settings.hero_subheadline,
        imageUrl: publicMediaUrl(slide.imageKey),
        gradient: (["brand", "ember", "charcoal", "gold"] as const)[
          index % 4
        ],
        ...heroActions,
      }))
    : [
        {
          id: "welcome",
          eyebrow: settings.church_name,
          title: settings.hero_headline,
          subtitle: settings.hero_subheadline,
          gradient: "brand",
          ...heroActions,
        },
        {
          id: "revival",
          eyebrow: "Our mandate",
          title: "Revival is the heartbeat of God",
          subtitle: intro.body,
          gradient: "ember",
          ...heroActions,
        },
        {
          id: "finished",
          eyebrow: scripture.title,
          title: "IT IS FINISHED",
          subtitle: scripture.body,
          gradient: "charcoal",
          ...heroActions,
        },
      ];

  const socials = [
    { href: settings.facebook_url, label: "Facebook", icon: Facebook },
    { href: settings.instagram_url, label: "Instagram", icon: Instagram },
    { href: settings.youtube_url, label: "YouTube", icon: Youtube },
    {
      href: settings.whatsapp_group_url,
      label: "WhatsApp",
      icon: MessageCircle,
    },
  ].filter((social) => social.href.startsWith("http"));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <HeroSlideshow slides={heroSlides} />

      <section className="content-auto mt-6 grid gap-3 sm:grid-cols-3">
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
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                  {item.label}
                </p>
                <p className="mt-1 break-words text-base font-semibold leading-6 text-charcoal/80">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="content-auto mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <SectionHeader
            eyebrow="Welcome"
            title={settings.welcome_title}
            description={`${settings.church_name}. ${settings.welcome_body}`}
          />
          <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-200/60 text-gold-500">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-semibold">
              {intro.title}
            </h3>
            <p className="mt-2 whitespace-pre-line text-base leading-7 text-charcoal/70">
              {intro.body}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                prefetch
                className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
              >
                Join Our Church Family
              </Link>
              <Link
                href="/vision-mission"
                prefetch
                className={buttonClasses("outline", "lg", "w-full sm:w-auto")}
              >
                Discover Our Vision
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift">
          <Badge tone="gold">Our foundation</Badge>
          <p className="mt-4 font-serif text-xl font-semibold text-white">
            {scripture.title}
          </p>
          <blockquote className="mt-3 text-base leading-8 text-cream/85">
            {scripture.body}
          </blockquote>
          <Link
            href="/about"
            prefetch
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-gold-200 hover:underline active:opacity-70"
          >
            Read our story
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <section className="content-auto mt-14">
        <SectionHeader
          eyebrow="Gather"
          title="Upcoming activities"
          description="Our weekly rhythm and special gatherings. Days, times and venues are editable by the church team."
          action={
            <Link href="/activities" prefetch>
              <span className={buttonClasses("outline", "sm")}>View all</span>
            </Link>
          }
        />
        {upcomingActivities.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingActivities.map((activity) => (
              <article
                key={activity.id}
                className="surface overflow-hidden"
              >
                {activity.imageKey ? (
                  <div className="relative aspect-[16/9] bg-brand-50">
                    <Image
                      src={publicMediaUrl(activity.imageKey) ?? ""}
                      alt={activity.title}
                      fill
                      loading="lazy"
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-5">
                  <Badge tone="brand">{activity.day || "Activity"}</Badge>
                  <h3 className="mt-3 font-serif text-xl font-semibold">
                    {activity.title}
                  </h3>
                  <dl className="mt-3 space-y-1 text-sm text-charcoal/65">
                    {activity.time ? (
                      <div className="flex gap-2">
                        <dt className="font-semibold text-charcoal/45">Time</dt>
                        <dd>{activity.time}</dd>
                      </div>
                    ) : null}
                    {activity.venue ? (
                      <div className="flex gap-2">
                        <dt className="font-semibold text-charcoal/45">Venue</dt>
                        <dd>{activity.venue}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {activity.description ? (
                    <p className="mt-3 text-base leading-7 text-charcoal/70">
                      {activity.description}
                    </p>
                  ) : null}
                  {activity.extraInfo ? (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-charcoal/55">
                      {activity.extraInfo}
                    </p>
                  ) : null}
                </div>
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

      <section className="content-auto mt-14">
        <SectionHeader
          eyebrow="Featured"
          title="Upcoming events"
          description="Special services, outreaches and gatherings published by the church team."
          action={
            <Link href="/events" prefetch>
              <span className={buttonClasses("outline", "sm")}>All events</span>
            </Link>
          }
        />
        {featuredEvents.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {featuredEvents.map((event) => (
              <article key={event.id} className="surface p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  {formatDate(event.startsAt)}
                </p>
                <h3 className="mt-2 font-serif text-xl font-semibold">
                  {event.title}
                </h3>
                <p className="mt-2 text-base leading-7 text-charcoal/70">
                  {event.location || "Location to be confirmed"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
            title="No events published yet"
            description="Upcoming events will appear here once the admin team publishes them."
          />
        )}
      </section>

      <section className="content-auto mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-3xl bg-gradient-to-br from-brand-800 to-ember-600 p-7 text-cream shadow-lift">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">
            {pastor.title}
          </p>
          <p className="mt-3 font-serif text-3xl font-bold text-white">
            {settings.pastor_name}
          </p>
          <p className="mt-4 text-base leading-7 text-cream/85">
            {pastor.body}
          </p>
          <Link
            href="/about"
            prefetch
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-gold-200 hover:underline active:opacity-70"
          >
            About the church
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div>
          <SectionHeader
            eyebrow="Serve"
            title="Featured departments"
            description="Discover the teams that make ministry happen and request to join one."
            action={
              <Link href="/departments" prefetch>
                <span className={buttonClasses("outline", "sm")}>View all</span>
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {departmentList.map((department) => (
              <Link
                key={department.id}
                href={`/departments/${department.slug}`}
                prefetch
                className="group rounded-3xl border border-brand-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 active:scale-[0.99] active:opacity-80"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <HeartHandshake className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold group-hover:text-brand-800">
                  {department.name}
                </h3>
                <p className="mt-1 text-base leading-7 text-charcoal/65">
                  {department.description || "Details will be added soon."}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="content-auto mt-14 grid gap-6 lg:grid-cols-2">
        <div className="surface p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          {devotional ? (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-700">
                {formatDate(
                  new Date(`${devotional.publishDate}T12:00:00+01:00`),
                )}
                {devotional.scripture ? ` · ${devotional.scripture}` : ""}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">
                {devotional.title}
              </h2>
              <p className="mt-2 line-clamp-4 whitespace-pre-line text-base leading-7 text-charcoal/70">
                {devotional.body}
              </p>
              <Link
                href={`/devotionals/${devotional.publishDate}`}
                prefetch
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline active:opacity-70"
              >
                Read today&apos;s devotional
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-4 font-serif text-2xl font-semibold">
                {devotionalBlock.title}
              </h2>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-charcoal/70">
                {devotionalBlock.body}
              </p>
              <Link
                href="/devotionals"
                prefetch
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline active:opacity-70"
              >
                Visit the devotional library
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
        <div className="rounded-3xl bg-charcoal p-6 text-cream shadow-lift sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">
            Pastoral care
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-white">
            {appointment.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-cream/75">
            {appointment.body}
          </p>
          <Link
            href="/appointments"
            prefetch
            className={buttonClasses("gold", "lg", "mt-6 w-full sm:w-auto")}
          >
            Book an appointment
          </Link>
        </div>
      </section>

      <section className="content-auto mt-14">
        <SectionHeader
          eyebrow="Connect"
          title="Contact the church"
          description="Reach out with questions about the church, membership or visiting."
          action={
            <Link href="/contact" prefetch>
              <span className={buttonClasses("outline", "sm")}>Contact page</span>
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="surface flex items-start gap-3 p-5">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                Address
              </p>
              <p className="mt-1 text-base leading-7 text-charcoal/75">
                {settings.address}
              </p>
            </div>
          </div>
          <div className="surface flex items-start gap-3 p-5">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                Phone
              </p>
              <p className="mt-1 text-base leading-7 text-charcoal/75">
                {settings.phone}
              </p>
            </div>
          </div>
          <div className="surface flex items-start gap-3 p-5">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                Email
              </p>
              <p className="mt-1 break-words text-base leading-7 text-charcoal/75">
                {settings.email}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wide text-charcoal/45">
            Follow us
          </span>
          {socials.length ? (
            socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-800 transition hover:bg-brand-50"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              );
            })
          ) : (
            <span className="text-sm text-charcoal/45">
              [Social links - edit in Admin]
            </span>
          )}
        </div>
      </section>

      <section className="content-auto mt-14 overflow-hidden rounded-3xl bg-charcoal px-6 py-10 text-center text-cream sm:px-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-gold-200">
          <Cross className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-bold text-white sm:text-3xl">
          Your place is waiting
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-cream/70">
          Come and worship with us, grow in the Word and discover your place in
          the house.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/register"
            prefetch
            className={buttonClasses("gold", "lg", "w-full sm:w-auto")}
          >
            Join Our Church Family
          </Link>
          <Link
            href="/departments"
            prefetch
            className={buttonClasses(
              "outline",
              "lg",
              "w-full border-white/25 bg-transparent text-white hover:bg-white/10 sm:w-auto",
            )}
          >
            Explore departments
          </Link>
        </div>
      </section>
    </div>
  );
}
