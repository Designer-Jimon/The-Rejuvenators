import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, lt, lte } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flame,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function todayLagos() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function displayDate(value: string) {
  return formatDate(new Date(`${value}T12:00:00+01:00`));
}

function paragraphs(value: string) {
  return value
    .split(/\n{2,}|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { title: "Devotional" };
  const today = todayLagos();
  if (date > today) return { title: "Devotional not found" };
  const db = await getDb();
  const [row] = await db
    .select({ title: devotionals.title, body: devotionals.body })
    .from(devotionals)
    .where(
      and(
        eq(devotionals.publishDate, date),
        eq(devotionals.status, "published"),
        eq(devotionals.isPublished, true),
      ),
    )
    .limit(1);
  if (!row) return { title: "Devotional not found" };
  return {
    title: row.title,
    description: row.body.replace(/\s+/g, " ").slice(0, 160),
  };
}

export default async function DevotionalPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const today = todayLagos();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) notFound();
  const db = await getDb();
  const [devotional] = await db
    .select()
    .from(devotionals)
    .where(
      and(
        eq(devotionals.publishDate, date),
        eq(devotionals.status, "published"),
        eq(devotionals.isPublished, true),
        lte(devotionals.publishDate, today),
      ),
    )
    .limit(1);
  if (!devotional) notFound();

  const [older, newer] = await Promise.all([
    db
      .select({
        publishDate: devotionals.publishDate,
        title: devotionals.title,
      })
      .from(devotionals)
      .where(
        and(
          eq(devotionals.status, "published"),
          eq(devotionals.isPublished, true),
          lt(devotionals.publishDate, date),
        ),
      )
      .orderBy(desc(devotionals.publishDate))
      .limit(1),
    db
      .select({
        publishDate: devotionals.publishDate,
        title: devotionals.title,
      })
      .from(devotionals)
      .where(
        and(
          eq(devotionals.status, "published"),
          eq(devotionals.isPublished, true),
          gt(devotionals.publishDate, date),
          lte(devotionals.publishDate, today),
        ),
      )
      .orderBy(asc(devotionals.publishDate))
      .limit(1),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/devotionals"
        prefetch
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All devotionals
      </Link>

      <article className="mt-4">
        <header className="rounded-3xl bg-brand-gradient p-5 text-cream shadow-lift sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gold-200">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {displayDate(devotional.publishDate)}
            </span>
            {devotional.dayNumber ? <span>Day {devotional.dayNumber}</span> : null}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
            {devotional.title}
          </h1>
          {devotional.scripture ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {devotional.scripture}
            </p>
          ) : null}
        </header>

        {devotional.bibleVerses ? (
          <section className="mt-5 rounded-2xl border border-brand-100 bg-white p-5">
            <h2 className="font-serif text-lg font-semibold">Scripture</h2>
            <div className="mt-2 whitespace-pre-line text-sm leading-7 text-charcoal/75">
              {devotional.bibleVerses}
            </div>
          </section>
        ) : null}

        <section className="mt-5 space-y-4">
          {paragraphs(devotional.body).map((paragraph, index) => (
            <p key={index} className="text-base leading-8 text-charcoal/80">
              {paragraph}
            </p>
          ))}
        </section>

        {devotional.declaration ? (
          <section className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/80 p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
              <Flame className="h-4 w-4" aria-hidden="true" />
              Declaration
            </p>
            <p className="mt-2 font-serif text-xl leading-8 text-brand-900">
              {devotional.declaration}
            </p>
          </section>
        ) : null}

        {devotional.prayerPoints ? (
          <section className="mt-5 rounded-2xl border border-brand-100 bg-white p-5">
            <h2 className="font-serif text-lg font-semibold">Prayer points</h2>
            <div className="mt-3 space-y-2">
              {paragraphs(devotional.prayerPoints).map((point, index) => (
                <p
                  key={index}
                  className="rounded-2xl bg-brand-50/60 px-4 py-3 text-sm leading-6 text-charcoal/75"
                >
                  {point}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </article>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {older[0] ? (
          <Link
            href={`/devotionals/${older[0].publishDate}`}
            prefetch
            className="surface flex min-h-20 items-center gap-3 p-4 transition active:scale-[0.99] active:opacity-80"
          >
            <ArrowLeft className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                Previous
              </span>
              <span className="mt-0.5 block text-sm font-semibold">
                {older[0].title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {newer[0] ? (
          <Link
            href={`/devotionals/${newer[0].publishDate}`}
            prefetch
            className="surface flex min-h-20 items-center justify-between gap-3 p-4 text-right transition active:scale-[0.99] active:opacity-80"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                Next
              </span>
              <span className="mt-0.5 block text-sm font-semibold">
                {newer[0].title}
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
