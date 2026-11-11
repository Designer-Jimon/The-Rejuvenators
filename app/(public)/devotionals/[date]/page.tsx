import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, isNull, lt, lte } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import { DAILY_MEAL_NAME } from "@/lib/branding";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { DailyMealTemplate } from "@/components/devotionals/daily-meal-template";
import { ShareDailyMeal } from "@/components/devotionals/share-button";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { title: DAILY_MEAL_NAME };
  const today = todayLagos();
  if (date > today) return { title: `${DAILY_MEAL_NAME} not found` };
  const db = await getDb();
  const [row] = await db
    .select({ title: devotionals.title, body: devotionals.body })
    .from(devotionals)
    .where(
      and(
        eq(devotionals.publishDate, date),
        eq(devotionals.status, "published"),
        eq(devotionals.isPublished, true),
        isNull(devotionals.archivedAt),
      ),
    )
    .limit(1);
  if (!row) return { title: `${DAILY_MEAL_NAME} not found` };
  return {
    title: `${row.title} | ${DAILY_MEAL_NAME}`,
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
        isNull(devotionals.archivedAt),
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
          isNull(devotionals.archivedAt),
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
          isNull(devotionals.archivedAt),
          gt(devotionals.publishDate, date),
          lte(devotionals.publishDate, today),
        ),
      )
      .orderBy(asc(devotionals.publishDate))
      .limit(1),
  ]);

  const dateLabel = displayDate(devotional.publishDate);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/devotionals"
        prefetch
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All Daily Meals
      </Link>

      <DailyMealTemplate
        className="mt-4"
        title={devotional.title}
        dateLabel={dateLabel}
        scripture={devotional.scripture}
        bibleVerses={devotional.bibleVerses}
        body={devotional.body}
        declaration={devotional.declaration}
        prayerPoints={devotional.prayerPoints}
      />

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <ShareDailyMeal title={devotional.title} dateLabel={dateLabel} />
        <a
          href={`/api/devotionals/${devotional.publishDate}/pdf`}
          download
          className={buttonClasses("primary", "md", "w-full sm:w-auto")}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Daily Meal (PDF)
        </a>
      </div>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {older[0] ? (
          <Link
            href={`/devotionals/${older[0].publishDate}`}
            prefetch
            className="surface flex min-h-20 items-center gap-3 p-4 transition active:scale-[0.99] active:opacity-80"
          >
            <ArrowLeft
              className="h-5 w-5 shrink-0 text-brand-700"
              aria-hidden="true"
            />
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
            <ArrowRight
              className="h-5 w-5 shrink-0 text-brand-700"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
