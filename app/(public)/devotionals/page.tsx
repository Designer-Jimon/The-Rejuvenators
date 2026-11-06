import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, lte } from "drizzle-orm";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHero } from "@/components/ui/display";

export const metadata: Metadata = {
  title: "Daily devotionals",
  description:
    "Daily devotionals from It Is Finished Revival Outreach, generated from the preached word and grounded in Scripture.",
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
        lte(devotionals.publishDate, todayLagos()),
      ),
    )
    .orderBy(desc(devotionals.publishDate))
    .limit(60);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Daily bread"
        title="Devotionals"
        description="Short daily readings from the sermon archive to help you abide in Christ through the week."
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
                  Read devotional
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
            title="No devotionals published yet"
            description="Published devotionals will appear here each morning."
          />
        )}
      </div>
    </div>
  );
}
