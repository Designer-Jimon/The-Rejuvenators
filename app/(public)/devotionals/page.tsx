import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import { CHURCH_NAME } from "@/lib/branding";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHero } from "@/components/ui/display";

export const metadata: Metadata = {
  title: "Daily Meal",
  description: `The Daily Meal from ${CHURCH_NAME}, grounded in Scripture and the preached word.`,
};
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

export default async function DevotionalsPage() {
  const db = await getDb();
  const list = await db
    .select({
      id: devotionals.id,
      title: devotionals.title,
      body: devotionals.body,
      scripture: devotionals.scripture,
      publishDate: devotionals.publishDate,
      dayNumber: devotionals.dayNumber,
    })
    .from(devotionals)
    .where(
      and(
        eq(devotionals.status, "published"),
        eq(devotionals.isPublished, true),
        isNull(devotionals.archivedAt),
        lte(devotionals.publishDate, todayLagos()),
      ),
    )
    .orderBy(desc(devotionals.publishDate))
    .limit(60);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Daily bread"
        title="Daily Meal"
        description="A short daily reading from the sermon archive to help you abide in Christ through the week."
      />

      <div className="mt-8">
        {list.length ? (
          <div className="space-y-3">
            {list.map((devotional, index) => (
              <Link
                key={devotional.id}
                href={`/devotionals/${devotional.publishDate}`}
                prefetch
                className="surface block p-5 transition active:scale-[0.99] active:opacity-80 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {displayDate(devotional.publishDate)}
                  </span>
                  {devotional.dayNumber ? (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5">
                      Day {devotional.dayNumber}
                    </span>
                  ) : null}
                  {index === 0 ? (
                    <span className="rounded-full bg-gold-100 px-2 py-0.5 text-gold-900">
                      Latest
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {devotional.title}
                </h2>
                {devotional.scripture ? (
                  <p className="mt-1 text-sm font-semibold text-brand-800">
                    {devotional.scripture}
                  </p>
                ) : null}
                <p className="mt-2 line-clamp-3 text-sm leading-7 text-charcoal/65">
                  {devotional.body}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-800">
                  Read Daily Meal
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
            title="No Daily Meals published yet"
            description="The Daily Meal will appear here each morning at 6:00 AM Lagos time."
          />
        )}
      </div>
    </div>
  );
}
